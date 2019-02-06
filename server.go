package main

import (
	"fmt"
	"log"
	"net/http"

	"github.com/gorilla/mux"
)

func main() {
	// create router
	router := mux.NewRouter().StrictSlash(true)

	// api
	router.HandleFunc("/api/health", todo).Methods("GET")
	router.HandleFunc("/api/rp", todo).Methods("POST")
	router.HandleFunc("/api/rp/import", todo).Methods("POST")
	router.HandleFunc("/api/rp/import/{id:[-0-9a-zA-Z]+}", todo).Methods("POST")
	router.HandleFunc("/api/user", todo).Methods("POST")
	router.HandleFunc("/api/user/verify", todo).Methods("GET")
	router.HandleFunc("/api/rp/{id:[-0-9a-zA-Z]+}", todo).Methods("GET")
	router.HandleFunc("/api/rp/{id:[-0-9a-zA-Z]+}/updates", todo).Methods("GET")
	router.HandleFunc("/api/rp/{id:[-0-9a-zA-Z]+}/pages", todo).Methods("GET")
	router.HandleFunc("/api/rp/{id:[-0-9a-zA-Z]+}/pages/{pageNum:[1-9][0-9]*}", todo).Methods("GET")
	router.HandleFunc("/api/rp/{id:[-0-9a-zA-Z]+}/download.txt", todo).Methods("GET")
	router.HandleFunc("/api/rp/{id:[-0-9a-zA-Z]+}/export", todo).Methods("GET")
	router.HandleFunc("/api/rp/{id:[-0-9a-zA-Z]+}/{collections:[a-z]+}", todo).Methods("POST")
	router.HandleFunc("/api/rp/{id:[-0-9a-zA-Z]+}/{collections:[a-z]+}/{docId:[0-9a-z]+}", todo).Methods("PUT")
	router.HandleFunc("/api/rp/{id:[-0-9a-zA-Z]+}/{collections:[a-z]+}/history", todo).Methods("GET")
	router.PathPrefix("/api").HandlerFunc(apiMalformed)

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
	log.Fatal(http.ListenAndServe(":8080", router))
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
