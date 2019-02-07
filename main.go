package main

import (
	"fmt"
	"log"
	"net/http"

	"github.com/gorilla/mux"
	"github.com/rpnow/rpnow/api"
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
	router.HandleFunc("/", api.IndexHTML).Methods("GET")
	router.HandleFunc("/terms", api.IndexHTML).Methods("GET")
	router.HandleFunc("/format", api.IndexHTML).Methods("GET")
	router.HandleFunc("/rp/{rpCode}", api.IndexHTML).Methods("GET")
	router.HandleFunc("/read/{rpCode}", api.IndexHTML).Methods("GET")
	router.HandleFunc("/read/{rpCode}/page/{page}", api.IndexHTML).Methods("GET")

	// assets
	router.PathPrefix("/").Handler(http.FileServer(http.Dir("views/dist")))

	// listen
	port := "8080"
	fmt.Printf("Listening on %s", port)
	log.Fatal(http.ListenAndServe(":"+port, router))
}

func apiMalformed(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusBadRequest)
	fmt.Fprintln(w, "{\"error\":\"Malformed request\"}")
}

func todo(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusNotImplemented)
	fmt.Fprintln(w, "TODO")
}
