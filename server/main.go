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
	"sort"
	"strings"
	"time"

	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"
	gonanoid "github.com/matoous/go-nanoid"
	"github.com/rs/xid"
)

var port = 13000
var addr = fmt.Sprintf(":%d", port)

var wsUpgrader = websocket.Upgrader{}

var RPsByID map[string]*RP
var SlugMap map[string]SlugInfo
var Revisions map[string][]json.RawMessage

func main() {
	// Print "Goodbye" after all defer statements are done
	defer log.Println("Goodbye!")

	RPsByID = make(map[string]*RP)
	SlugMap = make(map[string]SlugInfo)
	Revisions = make(map[string][]json.RawMessage)
	rooms = make(map[string]*room)
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
	roomAPI.HandleFunc("/msgs/{docId:[0-9a-z]+}/history", rpGetThingHistory).Methods("GET")
	roomAPI.HandleFunc("/charas/{docId:[0-9a-z]+}/history", rpGetThingHistory).Methods("GET")
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
	// defer gracefully closing the server
	defer func() {
		ctx, cancel := context.WithTimeout(context.Background(), time.Second*5)
		defer cancel()

		if err := srv.Shutdown(ctx); err != nil {
			log.Fatalf("http shutdown: %s", err)
		}
		log.Println("Http server stopped")
	}()

	// server is ready
	log.Printf("Listening on %s\n", addr)

	// await kill signal
	c := make(chan os.Signal, 1)
	signal.Notify(c, os.Interrupt)
	<-c
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
	SlugMap[slug] = SlugInfo{rpid, "normal"}
	SlugMap[readSlug] = SlugInfo{rpid, "read"}
	RPsByID[rpid] = &RP{rpid, header.Title, readSlug, []RpMessage{}, []RpChara{}}
	// tell user the created response slug
	json.NewEncoder(w).Encode(map[string]string{"rpCode": slug})
}

func rpChatStream(w http.ResponseWriter, r *http.Request) {
	// parse slug
	params := mux.Vars(r)

	// get rpid from slug
	slugInfo := SlugMap[params["slug"]]
	// TODO if empty...
	if slugInfo.Access != "normal" {
		log.Println("No chat access on " + params["slug"])
		w.WriteHeader(403)
		return
	}
	rp := RPsByID[slugInfo.Rpid]

	conn, err := wsUpgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println(err)
		return
	}
	defer conn.Close()

	if err := conn.WriteJSON(map[string]interface{}{
		"type": "init",
		"data": rp,
	}); err != nil {
		log.Fatal(err)
	}

	join(conn, rp.Rpid)
}

func rpSendThing(w http.ResponseWriter, r *http.Request, obj Doc, doAppend func(*RP, Doc)) {
	// generate key for new object
	obj.Meta().ID = xid.New().String()

	params := mux.Vars(r)

	slugInfo := SlugMap[params["slug"]]
	rp := RPsByID[slugInfo.Rpid]
	// TODO if empty...

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

	// put it in the db
	doAppend(rp, obj)

	// store revision as raw json?? meh
	revid := rp.Rpid + "/" + obj.Meta().ID
	js, _ := json.Marshal(obj)
	Revisions[revid] = append(Revisions[revid], js)
	rooms[rp.Rpid].broadcast <- js

	// bounce it back and send
	w.WriteHeader(204)
}

func rpSendMsg(w http.ResponseWriter, r *http.Request) {
	rpSendThing(w, r, NewRpMessage(), func(rp *RP, obj Doc) {
		rp.Messages = append(rp.Messages, obj.(RpMessage))
	})
}

func rpSendChara(w http.ResponseWriter, r *http.Request) {
	rpSendThing(w, r, NewRpChara(), func(rp *RP, obj Doc) {
		rp.Charas = append(rp.Charas, obj.(RpChara))
	})
}

func rpUpdateThing(w http.ResponseWriter, r *http.Request, getOldDoc func(*RP, string) Doc, doUpdate func(*RP, Doc)) {
	params := mux.Vars(r)

	slugInfo := SlugMap[params["slug"]]
	rp := RPsByID[slugInfo.Rpid]
	// TODO if empty...

	id := params["docId"]
	obj := getOldDoc(rp, id)

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

	// put it in the db
	doUpdate(rp, obj)

	// store revision as raw json?? meh
	revid := rp.Rpid + "/" + obj.Meta().ID
	js, _ := json.Marshal(obj)
	Revisions[revid] = append(Revisions[revid], js)
	rooms[rp.Rpid].broadcast <- js

	// bounce it back and send
	w.WriteHeader(204)
}

func rpUpdateMsg(w http.ResponseWriter, r *http.Request) {
	rpUpdateThing(w, r, func(rp *RP, id string) Doc {
		i := sort.Search(len(rp.Messages), func(i int) bool { return id <= rp.Messages[i].ID })
		return rp.Messages[i]
	}, func(rp *RP, obj Doc) {
		// rp.Messages = append(rp.Messages, obj.(RpMessage))
	})
}

func rpUpdateChara(w http.ResponseWriter, r *http.Request) {
	rpUpdateThing(w, r, func(rp *RP, id string) Doc {
		i := sort.Search(len(rp.Charas), func(i int) bool { return id <= rp.Charas[i].ID })
		return rp.Charas[i]
	}, func(rp *RP, obj Doc) {
		// rp.Charas = append(rp.Charas, obj.(RpChara))
	})
}

func rpGetThingHistory(w http.ResponseWriter, r *http.Request) {
	params := mux.Vars(r)

	slugInfo := SlugMap[params["slug"]]
	rp := RPsByID[slugInfo.Rpid]
	// TODO if empty...

	id := params["docId"]

	revisions := Revisions[rp.Rpid+"/"+id]

	// bounce it back and send
	json.NewEncoder(w).Encode(revisions)
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
