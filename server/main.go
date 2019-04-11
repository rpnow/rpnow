package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"regexp"
	"strings"
	"time"

	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"
	gonanoid "github.com/matoous/go-nanoid"
	"github.com/rs/xid"
)

var port = 13000
var addr = fmt.Sprintf(":%d", port)
var adminPort = 12789
var adminAddr = fmt.Sprintf("127.0.0.1:%d", adminPort)

var wsUpgrader = websocket.Upgrader{}

func main() {
	// Print "Goodbye" after all defer statements are done
	defer log.Println("Goodbye!")

	// listen
	closeAdminServer := serveRouter(adminRouter(), adminAddr)
	defer closeAdminServer()
	closeClientServer := serveRouter(clientRouter(), addr)
	defer closeClientServer()

	// server is ready
	log.Printf("Listening on %s\n", addr)

	// await kill signal
	c := make(chan os.Signal, 1)
	signal.Notify(c, os.Interrupt)
	<-c
}

func clientRouter() *mux.Router {
	// create router
	router := mux.NewRouter().StrictSlash(true)

	// api
	api := router.PathPrefix("/api").Subrouter()
	api.HandleFunc("/health", health).Methods("GET")
	api.HandleFunc("/dashboard", dashboard).Methods("POST")
	api.HandleFunc("/rp", createRp).Methods("POST")
	api.HandleFunc("/rp/import", todo).Methods("POST")
	api.HandleFunc("/rp/import/{slug:[-0-9a-zA-Z]+}", todo).Methods("POST")
	api.HandleFunc("/user", createUser).Methods("POST")
	api.HandleFunc("/user/verify", verifyUser).Methods("GET")
	roomAPI := api.PathPrefix("/rp/{slug:[-0-9a-zA-Z]+}").Subrouter()
	roomAPI.HandleFunc("/chat", rpChatStream).Methods("GET")
	roomAPI.HandleFunc("/pages", todo).Methods("GET")
	roomAPI.HandleFunc("/pages/{pageNum:[1-9][0-9]*}", todo).Methods("GET")
	roomAPI.HandleFunc("/download.txt", todo).Methods("GET")
	roomAPI.HandleFunc("/export", todo).Methods("GET")
	roomAPI.HandleFunc("/msgs", rpSendMsg).Methods("POST")
	roomAPI.HandleFunc("/charas", rpSendChara).Methods("POST")
	roomAPI.HandleFunc("/msgs/{docId:[0-9a-z]+}", rpUpdateMsg).Methods("PUT")
	roomAPI.HandleFunc("/charas/{docId:[0-9a-z]+}", rpUpdateChara).Methods("PUT")
	roomAPI.HandleFunc("/msgs/{docId:[0-9a-z]+}/history", rpGetMsgHistory).Methods("GET")
	roomAPI.HandleFunc("/charas/{docId:[0-9a-z]+}/history", rpGetCharaHistory).Methods("GET")
	api.PathPrefix("/").HandlerFunc(apiMalformed)

	// routes
	router.HandleFunc("/", indexHTML).Methods("GET")
	router.HandleFunc("/import", indexHTML).Methods("GET")
	router.HandleFunc("/format", indexHTML).Methods("GET")
	router.HandleFunc("/rp/{rpCode}", indexHTML).Methods("GET")
	router.HandleFunc("/read/{rpCode}", indexHTML).Methods("GET")
	router.HandleFunc("/read/{rpCode}/page/{page}", indexHTML).Methods("GET")

	// assets
	router.PathPrefix("/").Handler(http.FileServer(http.Dir("../views/dist")))

	return router
}

func adminRouter() *mux.Router {
	// create router
	router := mux.NewRouter().StrictSlash(true)

	router.HandleFunc("/status", todo).Methods("GET")
	router.HandleFunc("/rps", todo).Methods("GET")
	router.HandleFunc("/rps/{slug:[-0-9a-zA-Z]+}", todo).Methods("GET")
	router.HandleFunc("/rps/{slug:[-0-9a-zA-Z]+}", todo).Methods("DELETE")
	router.HandleFunc("/url/{url}", todo).Methods("DELETE")
	router.HandleFunc("/url/{url}", todo).Methods("PUT")

	return router
}

func serveRouter(router *mux.Router, addr string) func() {
	// listen
	srv := &http.Server{
		Addr: addr,
		// Good practice to set timeouts to avoid Slowloris attacks.
		WriteTimeout: time.Second * 15,
		ReadTimeout:  time.Second * 15,
		IdleTimeout:  time.Second * 60,
		Handler:      router, // Pass our instance of gorilla/mux in.
	}
	go func() {
		if err := srv.ListenAndServe(); err != http.ErrServerClosed {
			log.Fatalf("listen and serve: %s", err)
		}
	}()
	// return shutdown function
	return func() {
		ctx, cancel := context.WithTimeout(context.Background(), time.Second*5)
		defer cancel()

		if err := srv.Shutdown(ctx); err != nil {
			log.Fatalf("http shutdown: %s", err)
		}
		log.Printf("Http server stopped: %s\n", addr)
	}
}

func health(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintln(w, `{"rpnow":"ok"}`)
}

func dashboard(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintln(w, `{"canCreate":true,"canImport":true}`)
}

func createRp(w http.ResponseWriter, r *http.Request) {
	// parse rp header fields
	var header struct {
		Title string
	}
	err := json.NewDecoder(r.Body).Decode(&header)
	if err != nil {
		panic(err)
	}
	// generate slug
	slug, err := gonanoid.Generate("abcdefhjknpstxyz23456789", 20)
	if err != nil {
		panic(err)
	}
	readSlug, err := gonanoid.Generate("abcdefhjknpstxyz23456789", 20)
	if err != nil {
		panic(err)
	}
	readSlug = strings.ToLower(header.Title) + "-" + readSlug
	readSlug = regexp.MustCompile("[^a-z0-9]+").ReplaceAllString(readSlug, "-")
	// generate rpid
	rpid := "rp_" + xid.New().String()

	// add to db
	db.addSlugInfo(slug, &SlugInfo{rpid, "normal"})
	db.addSlugInfo(readSlug, &SlugInfo{rpid, "read"})
	db.addRoomInfo(rpid, &RoomInfo{header.Title, readSlug})
	// tell user the created response slug
	json.NewEncoder(w).Encode(map[string]string{"rpCode": slug})
}

type chatStreamMessage struct {
	Type string          `json:"type"`
	Data json.RawMessage `json:"data"`
}

func rpChatStream(w http.ResponseWriter, r *http.Request) {
	var rp struct {
		*RoomInfo
		Messages []RpMessage `json:"msgs"`
		Charas   []RpChara   `json:"charas"`
	}
	// parse slug
	params := mux.Vars(r)

	// get rpid from slug
	slugInfo := db.getSlugInfo(params["slug"])
	// TODO if empty...
	if slugInfo.Access != "normal" {
		log.Println("No chat access on " + params["slug"])
		w.WriteHeader(403)
		return
	}

	rp.RoomInfo = db.getRoomInfo(slugInfo.Rpid)

	rp.Messages = db.getRecentMsgs(slugInfo.Rpid)
	rp.Charas = db.getCharas(slugInfo.Rpid)

	conn, err := wsUpgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println(err)
		return
	}
	defer conn.Close()

	js, _ := json.Marshal(rp)
	if err := conn.WriteJSON(chatStreamMessage{"init", js}); err != nil {
		log.Fatal(err)
	}

	join(conn, slugInfo.Rpid)
}

func rpSendThing(w http.ResponseWriter, r *http.Request, updateType string, obj Doc) {
	// generate key for new object
	obj.Meta().ID = xid.New().String()

	params := mux.Vars(r)

	slugInfo := db.getSlugInfo(params["slug"])
	// TODO if empty...
	if slugInfo.Access != "normal" {
		log.Println("No chat access on " + params["slug"])
		w.WriteHeader(403)
		return
	}

	// populate received body
	err := obj.ParseBody(r.Body)
	if err != nil {
		panic(err)
	}
	// validate
	err = obj.Validate()
	if err != nil {
		log.Fatal(err)
	}

	// More
	obj.Meta().Timestamp = time.Now()
	obj.Meta().Userid = "nobody09c39024f1ef"
	obj.Meta().Revision = 0

	// Add to DB
	db.putMsgOrChara(updateType, slugInfo.Rpid, obj)

	// Broadcast
	js, _ := json.Marshal(obj)
	rooms[slugInfo.Rpid].broadcast <- chatStreamMessage{updateType, js}

	// Done
	w.WriteHeader(204)
}

func rpSendMsg(w http.ResponseWriter, r *http.Request) {
	rpSendThing(w, r, "msgs", NewRpMessage())
}

func rpSendChara(w http.ResponseWriter, r *http.Request) {
	rpSendThing(w, r, "charas", NewRpChara())
}

func rpUpdateThing(w http.ResponseWriter, r *http.Request, updateType string, getOldDoc func(rpid string, id string) Doc) {
	params := mux.Vars(r)

	slugInfo := db.getSlugInfo(params["slug"])
	// TODO if empty...
	if slugInfo.Access != "normal" {
		log.Println("No chat access on " + params["slug"])
		w.WriteHeader(403)
		return
	}

	obj := getOldDoc(slugInfo.Rpid, params["docId"])
	if obj == nil {
		log.Printf("No document to edit: %s/%s", slugInfo.Rpid, params["docId"])
		w.WriteHeader(404)
		return
	}

	// Store previous revision
	db.putMsgOrCharaRevision(updateType, slugInfo.Rpid, obj)

	// populate received body
	err := obj.ParseBody(r.Body)
	if err != nil {
		panic(err)
	}
	// validate
	err = obj.Validate()
	if err != nil {
		log.Fatal(err)
	}

	// More
	obj.Meta().Timestamp = time.Now()
	obj.Meta().Userid = "nobody09c39024f1ef"
	obj.Meta().Revision++

	// Update DB
	db.putMsgOrChara(updateType, slugInfo.Rpid, obj)

	// Broadcast
	js, _ := json.Marshal(obj)
	rooms[slugInfo.Rpid].broadcast <- chatStreamMessage{updateType, js}

	// Done
	w.WriteHeader(204)
}

func rpUpdateMsg(w http.ResponseWriter, r *http.Request) {
	rpUpdateThing(w, r, "msgs", func(rpid string, id string) Doc {
		return db.getMsg(rpid, id)
	})
}

func rpUpdateChara(w http.ResponseWriter, r *http.Request) {
	rpUpdateThing(w, r, "charas", func(rpid string, id string) Doc {
		return db.getChara(rpid, id)
	})
}

func rpGetThingHistory(w http.ResponseWriter, r *http.Request, thingType string) {
	params := mux.Vars(r)

	slugInfo := db.getSlugInfo(params["slug"])
	// TODO if empty...

	id := params["docId"]

	docRevisions := db.getMsgOrCharaRevisions(thingType, slugInfo.Rpid, id)

	// bounce it back and send
	json.NewEncoder(w).Encode(docRevisions)
}

func rpGetMsgHistory(w http.ResponseWriter, r *http.Request) {
	rpGetThingHistory(w, r, "msgs")
}

func rpGetCharaHistory(w http.ResponseWriter, r *http.Request) {
	rpGetThingHistory(w, r, "charas")
}

func createUser(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintln(w, `{"userid":"nobody09c39024f1ef","token":"x"}`)
}

func verifyUser(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusNoContent)
}

func indexHTML(w http.ResponseWriter, r *http.Request) {
	http.ServeFile(w, r, "../views/dist/index.html")
}

func apiMalformed(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusBadRequest)
	fmt.Fprintln(w, "{\"error\":\"Malformed request\"}")
}

func todo(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusNotImplemented)
	fmt.Fprintln(w, "TODO")
}
