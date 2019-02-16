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
	"time"

	"github.com/gorilla/mux"
	gonanoid "github.com/matoous/go-nanoid"
	"github.com/rpnow/rpnow/db"
	"github.com/rs/xid"
)

var port = 13000
var addr = fmt.Sprintf(":%d", port)

func main() {
	// Print "Goodbye" after all defer statements are done
	defer log.Println("Goodbye!")

	// db
	if err := db.Open("./data/rpnow.boltdb"); err != nil {
		log.Fatal(err)
	}
	defer func() {
		err := db.Close()
		if err != nil {
			log.Fatal(err)
		}
		log.Println("Database stopped")
	}()

	// create router
	router := mux.NewRouter().StrictSlash(true)

	// api
	api := router.PathPrefix("/api").Subrouter()
	api.HandleFunc("/health", health).Methods("GET")
	api.HandleFunc("/rp", createRp).Methods("POST")
	api.HandleFunc("/rp/import", todo).Methods("POST")
	api.HandleFunc("/rp/import/{slug:[-0-9a-zA-Z]+}", todo).Methods("POST")
	api.HandleFunc("/user", createUser).Methods("POST")
	api.HandleFunc("/user/verify", verifyUser).Methods("GET")
	roomAPI := api.PathPrefix("/rp/{slug:[-0-9a-zA-Z]+}").Subrouter()
	roomAPI.HandleFunc("/", rpChat).Methods("GET")
	roomAPI.HandleFunc("/updates", rpChatUpdates).Methods("GET").Queries("since", "{since:[1-9][0-9]*}")
	roomAPI.HandleFunc("/pages", todo).Methods("GET")
	roomAPI.HandleFunc("/pages/{pageNum:[1-9][0-9]*}", todo).Methods("GET")
	roomAPI.HandleFunc("/download.txt", todo).Methods("GET")
	roomAPI.HandleFunc("/export", todo).Methods("GET")
	roomAPI.HandleFunc("/{collectionName:[a-z]+}", rpSendThing).Methods("POST")
	roomAPI.HandleFunc("/{collectionName:[a-z]+}/{docId:[0-9a-z]+}", todo).Methods("PUT")
	roomAPI.HandleFunc("/{collectionName:[a-z]+}/history", todo).Methods("GET")
	api.PathPrefix("/").HandlerFunc(apiMalformed)

	// routes
	router.HandleFunc("/", indexHTML).Methods("GET")
	router.HandleFunc("/terms", indexHTML).Methods("GET")
	router.HandleFunc("/format", indexHTML).Methods("GET")
	router.HandleFunc("/rp/{rpCode}", indexHTML).Methods("GET")
	router.HandleFunc("/read/{rpCode}", indexHTML).Methods("GET")
	router.HandleFunc("/read/{rpCode}/page/{page}", indexHTML).Methods("GET")

	// assets
	router.PathPrefix("/").Handler(http.FileServer(http.Dir("views/dist")))

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

type RoomHeader struct {
	Title string `json:"title"`
}

type SlugInfo struct {
	Rpid string `json:"rpid"`
}

func createRp(w http.ResponseWriter, r *http.Request) {
	// parse rp header fields
	var fields RoomHeader
	err := json.NewDecoder(r.Body).Decode(&fields)
	if err != nil {
		panic(err)
	}
	log.Println(fields)
	// generate slug
	slug, err := gonanoid.Generate("abcdefhjknpstxyz23456789", 20)
	if err != nil {
		panic(err)
	}
	// generate rpid
	var slugInfo SlugInfo
	slugInfo.Rpid = "rp_" + xid.New().String()

	// add to db
	db.Add(slugInfo.Rpid+"_head", fields)
	db.Add("slug_"+slug, slugInfo)
	// tell user the created response slug
	json.NewEncoder(w).Encode(map[string]string{"rpCode": slug})
}

func rpChat(w http.ResponseWriter, r *http.Request) {
	// data to be sent
	type RpData struct {
		*RoomHeader
		Msgs     []int  `json:"msgs"`
		Charas   []int  `json:"charas"`
		LastSeq  int    `json:"lastEventId"`
		ReadCode string `json:"readCode"`
	}
	var data RpData

	// parse slug
	params := mux.Vars(r)
	// get rpid from slug
	var slugInfo SlugInfo
	err := db.One("slug_"+params["slug"], &slugInfo)
	if err != nil {
		panic(err)
	}
	// get rp data
	err = db.One(slugInfo.Rpid+"_head", &data.RoomHeader)
	if err != nil {
		panic(err)
	}
	data.Msgs = []int{}
	data.Charas = []int{}
	data.LastSeq = 2
	data.ReadCode = "abc-read"

	// send data
	json.NewEncoder(w).Encode(data)
}

func rpChatUpdates(w http.ResponseWriter, r *http.Request) {
	params := mux.Vars(r)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"lastEventId": params["since"],
		"updates":     []interface{}{},
	})
}

type RpMessageBody struct {
	Type    string `json:"type"`
	Content string `json:"content"`
	URL     string `json:"url"`
	CharaID string `json:"charaId,omitempty"`
}

func (m *RpMessageBody) Validate() error {
	if m.Type == "image" {
		if m.Content != "" {
			return fmt.Errorf("Msg: image should not have 'content'")
		}
		if m.CharaID != "" {
			return fmt.Errorf("Msg: image should not have 'charaId'")
		}
		urlRegexp := regexp.MustCompile("^https?://[-A-Za-z0-9+&@#/%?=~_|!:,.;]+$")
		if urlRegexp.MatchString(m.URL) {
			return fmt.Errorf("Msg: url is invalid")
		}
		return nil
	} else if m.Type == "narrator" || m.Type == "chara" || m.Type == "ooc" {
		if m.URL != "" {
			return fmt.Errorf("Msg: non-image should not have 'url'")
		}
		if m.Content == "" {
			return fmt.Errorf("Msg: content is empty")
		}
		if len(m.Content) > 10000 {
			return fmt.Errorf("Msg: content is too long (%d characters)", len(m.Content))
		}
		if m.Type == "chara" {
			if m.CharaID == "" {
				return fmt.Errorf("Msg: charaId is empty")
			}
			// TODO check if the doc is in the db
		} else {
			if m.CharaID != "" {
				return fmt.Errorf("Msg: non-chara msg should not have 'charaId'")
			}
		}
		return nil
	} else {
		return fmt.Errorf("Msg: invalid type")
	}
}

type RpMessage struct {
	*RpMessageBody
}

type RpCharaBody struct {
	Name  string `json:"name"`
	Color string `json:"color"`
}

type RpChara struct {
	*RpCharaBody
}

func (c *RpCharaBody) Validate() error {
	if len(c.Name) == 0 {
		return fmt.Errorf("Chara: name is empty")
	}
	if len(c.Name) > 30 {
		return fmt.Errorf("Chara: name is too long")
	}
	colorRegexp := regexp.MustCompile("^#[0-9a-f]{6}$")
	if !colorRegexp.MatchString(c.Color) {
		return fmt.Errorf("Chara: color is invalid")
	}
	return nil
}

func rpSendThing(w http.ResponseWriter, r *http.Request) {
	// generate key for new object
	params := mux.Vars(r)
	var slugInfo SlugInfo
	err := db.One("slug_"+params["slug"], &slugInfo)
	if err != nil {
		panic(err)
	}
	id := xid.New().String()
	key := slugInfo.Rpid + "_" + params["collectionName"] + "_" + id

	// validate value
	// TODO

	// put it in the db
	db.Add(key, []byte{})

	// bounce it back and send
}

func createUser(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintln(w, `{"userid":"nobody","token":"x"}`)
}

func verifyUser(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusNoContent)
}

func indexHTML(w http.ResponseWriter, r *http.Request) {
	http.ServeFile(w, r, "views/dist/index.html")
}

func apiMalformed(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusBadRequest)
	fmt.Fprintln(w, "{\"error\":\"Malformed request\"}")
}

func todo(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusNotImplemented)
	fmt.Fprintln(w, "TODO")
}
