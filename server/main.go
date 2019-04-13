package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"os/signal"
	"regexp"
	"strconv"
	"strings"
	"sync"
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

	// db setup
	db.open()
	defer func() {
		if err := db.close(); err != nil {
			log.Fatalf("Error: db.close: %s", err)
		}
		log.Println("Database closed")
	}()

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
	api.HandleFunc("/rp/import", rpImportJson).Methods("POST")
	api.HandleFunc("/user", createUser).Methods("POST")
	api.HandleFunc("/user/verify", verifyUser).Methods("GET")
	roomAPI := api.PathPrefix("/rp/{slug:[-0-9a-zA-Z]+}").Subrouter()
	roomAPI.HandleFunc("/chat", rpChatStream).Methods("GET")
	roomAPI.HandleFunc("/pages", rpReadIndex).Methods("GET")
	roomAPI.HandleFunc("/pages/{pageNum:[1-9][0-9]*}", rpReadPage).Methods("GET")
	roomAPI.HandleFunc("/download.txt", rpExportTxt).Methods("GET").Queries("includeOOC", "{includeOOC:true}")
	roomAPI.HandleFunc("/download.txt", rpExportTxt).Methods("GET")
	roomAPI.HandleFunc("/export", rpExportJson).Methods("GET")
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

func generateRpid() string {
	return "rp_" + xid.New().String()
}
func generateSlug(title string) string {
	slug, err := gonanoid.Generate("abcdefhjknpstxyz23456789", 20)
	if err != nil {
		panic(err)
	}
	if title == "" {
		return slug
	}
	sluggedTitle := regexp.MustCompile("[^a-z0-9]+").ReplaceAllString(strings.ToLower(title), "-")
	return sluggedTitle + "-" + slug
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

	slug := generateSlug("")
	readSlug := generateSlug(header.Title)
	rpid := generateRpid()

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
	err = obj.CheckRelations()
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
	err = obj.CheckRelations()
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

func rpReadIndex(w http.ResponseWriter, r *http.Request) {
	var idx struct {
		Title     string `json:"title"`
		PageCount int    `json:"pageCount"`
	}

	// parse slug
	params := mux.Vars(r)

	// get rpid from slug
	slugInfo := db.getSlugInfo(params["slug"])
	// TODO if empty...

	idx.Title = db.getRoomInfo(slugInfo.Rpid).Title
	idx.PageCount = db.countRoomPages(slugInfo.Rpid)

	// bounce it back and send
	json.NewEncoder(w).Encode(idx)
}

func rpReadPage(w http.ResponseWriter, r *http.Request) {
	var idx struct {
		Title     string      `json:"title"`
		PageCount int         `json:"pageCount"`
		Messages  []RpMessage `json:"msgs"`
		Charas    []RpChara   `json:"charas"`
	}

	// parse slug
	params := mux.Vars(r)

	// get rpid from slug
	slugInfo := db.getSlugInfo(params["slug"])
	// TODO if empty...

	// validate page number
	pageNum, err := strconv.ParseInt(params["pageNum"], 10, 32)
	if err != nil {
		log.Printf("Invalid page number: %s", params["pageNum"])
		w.WriteHeader(400)
		return
	}

	idx.Title = db.getRoomInfo(slugInfo.Rpid).Title
	idx.PageCount = db.countRoomPages(slugInfo.Rpid)
	idx.Messages = db.getPageMsgs(slugInfo.Rpid, int(pageNum))
	idx.Charas = db.getCharas(slugInfo.Rpid)

	// bounce it back and send
	json.NewEncoder(w).Encode(idx)
}

func rpExportTxt(w http.ResponseWriter, r *http.Request) {
	// parse slug
	params := mux.Vars(r)

	// get rpid from slug
	slugInfo := db.getSlugInfo(params["slug"])
	// TODO if empty...

	// Write title
	title := db.getRoomInfo(slugInfo.Rpid).Title
	w.Header().Add("Content-Disposition", "attachment; filename=\""+strings.ToLower(title)+".txt\"")
	w.Write([]byte(title + "\r\n\r\n----------\r\n\r\n"))

	// map of charas by id
	charas := db.getCharas(slugInfo.Rpid)
	charasMap := map[string]*RpChara{}
	for _, chara := range charas {
		charasMap[chara.ID] = &chara
	}

	// include ooc messages?
	includeOOCParam, includeOOCinMap := params["includeOOC"]
	includeOOC := includeOOCinMap && includeOOCParam != "false"

	// get msgs from db cursor
	msgs, errs := db.getAllMsgs(slugInfo.Rpid)
	for msg := range msgs {
		if msg.Type == "ooc" && !includeOOC {
			continue
		}
		var chara *RpChara
		if msg.Type == "chara" {
			chara = charasMap[msg.CharaID]
		}
		w.Write([]byte(msg.ToTxt(chara) + "\r\n\r\n"))
	}
	// die if error
	if err := <-errs; err != nil {
		log.Fatal(err)
	}
}

type exportFirstBlock struct {
	Title  string        `json:"title"`
	Charas []exportChara `json:"charas"`
}
type exportChara struct {
	Timestamp time.Time `json:"timestamp"`
	*RpCharaBody
}
type exportMessage struct {
	Timestamp time.Time `json:"timestamp"`
	*RpMessageBody
	CharaID *int `json:"charaId,omitempty"`
}

func rpExportJson(w http.ResponseWriter, r *http.Request) {
	var rpMeta exportFirstBlock

	// parse slug
	params := mux.Vars(r)

	// get rpid from slug
	slugInfo := db.getSlugInfo(params["slug"])
	// TODO if empty...

	// Get title
	title := db.getRoomInfo(slugInfo.Rpid).Title
	rpMeta.Title = title

	// map of charas by id
	charas := db.getCharas(slugInfo.Rpid)
	charaIDMap := map[string]int{}
	for i, chara := range charas {
		charaIDMap[chara.ID] = i
		rpMeta.Charas = append(rpMeta.Charas, exportChara{chara.Timestamp, chara.RpCharaBody})
	}

	// write out header block
	firstBlock, _ := json.Marshal(rpMeta)
	w.Header().Add("Content-Disposition", "attachment; filename=\""+strings.ToLower(title)+".json\"")
	w.Write([]byte("[\n"))
	w.Write(firstBlock)

	// write out each message
	msgs, errs := db.getAllMsgs(slugInfo.Rpid)
	for msg := range msgs {
		out := exportMessage{RpMessageBody: msg.RpMessageBody, Timestamp: msg.Timestamp}
		if msg.Type == "chara" {
			charaID := charaIDMap[msg.CharaID]
			out.CharaID = &charaID
		}
		js, _ := json.Marshal(out)
		w.Write([]byte(",\n"))
		w.Write(js)
	}
	// die if error
	if err := <-errs; err != nil {
		log.Fatal(err)
	}

	// done
	w.Write([]byte("\n]\n"))
}

func rpImportJson(w http.ResponseWriter, r *http.Request) {
	// open file sent through "file" multiform param
	file, _, err := r.FormFile("file")
	if err != nil {
		fmt.Println(err)
		w.WriteHeader(400)
		return
	}
	defer file.Close()

	// decode json in file
	dec := json.NewDecoder(file)

	// read first json token, which should be "array start"
	if t, err := dec.Token(); err != nil || t.(json.Delim) != '[' {
		if err != nil {
			http.Error(w, err.Error(), 400)
		} else {
			http.Error(w, fmt.Sprintf("Starting delimiter is %s", t), 400)
		}
		return
	}

	// read non-message stuff from first el
	var meta exportFirstBlock
	if err := dec.Decode(&meta); err != nil {
		http.Error(w, err.Error(), 400)
		return
	}

	slug := generateSlug("")
	readSlug := generateSlug(meta.Title)
	rpid := generateRpid()

	db.addSlugInfo(slug, &SlugInfo{rpid, "normal"})
	db.addSlugInfo(readSlug, &SlugInfo{rpid, "read"})
	db.addRoomInfo(rpid, &RoomInfo{meta.Title, readSlug})

	charas := make([]RpChara, len(meta.Charas))
	for i, rawChara := range meta.Charas {
		chara := NewRpChara()
		chara.RpCharaBody = rawChara.RpCharaBody
		chara.Timestamp = rawChara.Timestamp
		chara.ID = xid.New().String()
		chara.Userid = "nobody09c39024f1ef"
		chara.Revision = 0
		charas[i] = chara
		if err := chara.Validate(); err != nil {
			http.Error(w, err.Error(), 400)
			return
		}
		db.putChara(rpid, &chara)
	}

	// read all remaining elements in the array as msgs
	var wg sync.WaitGroup
	for dec.More() {
		var rawMsg exportMessage

		if err := dec.Decode(&rawMsg); err != nil {
			fmt.Println(err)
			w.WriteHeader(500)
			return
		}

		msg := NewRpMessage()
		msg.RpMessageBody = rawMsg.RpMessageBody
		if msg.Type == "chara" {
			if rawMsg.CharaID == nil || *rawMsg.CharaID < 0 || *rawMsg.CharaID >= len(charas) {
				http.Error(w, fmt.Sprintf("Invalid CharaID: %d", *rawMsg.CharaID), 400)
				return
			}
			msg.CharaID = charas[*rawMsg.CharaID].ID
		}
		msg.Timestamp = rawMsg.Timestamp
		msg.ID = xid.New().String()
		msg.Userid = "nobody09c39024f1ef"
		msg.Revision = 0

		if err := msg.Validate(); err != nil {
			http.Error(w, err.Error(), 400)
			return
		}
		wg.Add(1)
		go func(msg *RpMessage) {
			db.putMsg(rpid, msg)
			wg.Done()
		}(&msg)
	}
	wg.Wait()

	// read ending
	if t, err := dec.Token(); err != nil || t.(json.Delim) != ']' {
		http.Error(w, err.Error(), 400)
		return
	}
	if _, err := dec.Token(); err != io.EOF {
		http.Error(w, "Unexpected items after the array", 400)
		return
	}
	fmt.Println("read")

	json.NewEncoder(w).Encode(map[string]string{"rpCode": slug})
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
