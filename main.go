package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/gorilla/mux"
	bolt "go.etcd.io/bbolt"
)

var port = 8080
var addr = fmt.Sprintf(":%d", port)

func main() {
	// db
	db, err := bolt.Open("my.db", 0600, &bolt.Options{Timeout: 1 * time.Second})
	if err != nil {
		panic(err)
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
	fmt.Printf("Listening on %s\n", addr)
	log.Fatal(http.ListenAndServe(addr, router))
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
		fmt.Println(fields)
		json.NewEncoder(w).Encode(map[string]string{"rpCode": "abc"})
	}
}

func rpChat(w http.ResponseWriter, r *http.Request) {
	params := mux.Vars(r)
	fmt.Println(params)
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
	fmt.Println(params)
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
