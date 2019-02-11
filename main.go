package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"math"
	"net/http"
	"os"
	"os/signal"
	"time"

	"github.com/dgraph-io/badger"
	"github.com/gorilla/mux"
	gonanoid "github.com/matoous/go-nanoid"
	"github.com/rs/xid"
)

var port = 8080
var addr = fmt.Sprintf(":%d", port)
var db badger.DB

func main() {
	// Print "Goodbye" after all defer statements are done
	defer log.Println("Goodbye!")

	// db
	opts := badger.DefaultOptions
	opts.Dir = "./db"
	opts.ValueDir = "./db"
	opts.NumVersionsToKeep = math.MaxInt32
	// TODO disable opts.Logger when it becomes available in a future release of Badger

	db, err := badger.Open(opts)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	// create router
	router := mux.NewRouter().StrictSlash(true)

	// api
	api := router.PathPrefix("/api").Subrouter()
	api.HandleFunc("/health", health).Methods("GET")
	api.HandleFunc("/rp", createRp()).Methods("POST")
	api.HandleFunc("/rp/import", todo).Methods("POST")
	api.HandleFunc("/rp/import/{id:[-0-9a-zA-Z]+}", todo).Methods("POST")
	api.HandleFunc("/user", todo).Methods("POST")
	api.HandleFunc("/user/verify", verifyUser).Methods("GET")
	roomAPI := api.PathPrefix("/rp/{id:[-0-9a-zA-Z]+}").Subrouter()
	roomAPI.HandleFunc("/", rpChat).Methods("GET")
	roomAPI.HandleFunc("/updates", rpChatUpdates).Methods("GET").Queries("since", "{since:[1-9][0-9]*}")
	roomAPI.HandleFunc("/pages", todo).Methods("GET")
	roomAPI.HandleFunc("/pages/{pageNum:[1-9][0-9]*}", todo).Methods("GET")
	roomAPI.HandleFunc("/download.txt", todo).Methods("GET")
	roomAPI.HandleFunc("/export", todo).Methods("GET")
	roomAPI.HandleFunc("/{collections:[a-z]+}", todo).Methods("POST")
	roomAPI.HandleFunc("/{collections:[a-z]+}/{docId:[0-9a-z]+}", todo).Methods("PUT")
	roomAPI.HandleFunc("/{collections:[a-z]+}/history", todo).Methods("GET")
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

	log.Printf("Listening on %s\n", addr)

	// await kill signal
	c := make(chan os.Signal, 1)
	signal.Notify(c, os.Interrupt)
	<-c

	// gracefully end http server
	ctx, cancel := context.WithTimeout(context.Background(), time.Second*5)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("http shutdown: %s", err)
	}
	log.Println("Http server stopped")
}

func health(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintln(w, `{"rpnow":"ok"}`)
}

func createRp() http.HandlerFunc {
	type request struct {
		Title string `json:"title"`
	}
	return func(w http.ResponseWriter, r *http.Request) {
		var fields request
		if err := json.NewDecoder(r.Body).Decode(&fields); err != nil {
			panic(err)
		}
		log.Println(fields)
		url, err := gonanoid.Nanoid()
		if err != nil {
			panic(err)
		}
		rpid := xid.New()
		// err = db.Update(func(tx *bolt.Tx) error {
		// 	rp, err := tx.CreateBucket(rpid.Bytes())
		// 	if err != nil {
		// 		return err
		// 	}
		// 	_ = rp // TODO put field meta in rp bucket

		// 	urls := tx.Bucket([]byte("urls"))
		// 	err = urls.Put([]byte(url), rpid.Bytes())
		// 	if err != nil {
		// 		return err
		// 	}
		// 	return nil
		// })
		// if err != nil {
		// 	panic(err)
		// }
		_, _ = url, rpid
		json.NewEncoder(w).Encode(map[string]string{"rpCode": "abc"})
	}
}

func rpChat(w http.ResponseWriter, r *http.Request) {
	params := mux.Vars(r)
	log.Println(params)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"title":       "Test API",
		"msgs":        []interface{}{},
		"charas":      []interface{}{},
		"lastEventId": 2,
		"readCode":    "abc-read",
	})
}

func rpChatUpdates(w http.ResponseWriter, r *http.Request) {
	params := mux.Vars(r)
	log.Println(params)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"lastEventId": params["since"],
		"updates":     []interface{}{},
	})
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
