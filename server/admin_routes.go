package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"time"

	"github.com/gorilla/mux"
)

func adminRouter() *mux.Router {
	// create router
	router := mux.NewRouter().StrictSlash(true)

	router.HandleFunc("/status", adminStatus).Methods("GET")
	router.HandleFunc("/rps", adminRPList).Methods("GET")
	router.HandleFunc("/rps/{slug:[-0-9a-zA-Z]+}", adminRPInfo).Methods("GET")
	router.HandleFunc("/rps/{slug:[-0-9a-zA-Z]+}", adminDeleteRP).Methods("DELETE")
	router.HandleFunc("/url/{url}", adminDeleteLink).Methods("DELETE")
	router.HandleFunc("/url/{url}", adminSetLink).Methods("PUT")
	router.PathPrefix("/").HandlerFunc(apiMalformed)

	return router
}

func adminStatus(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintf(w, `{"rpnow":"ok","pid":%d}`, os.Getpid())
}

func adminRPList(w http.ResponseWriter, r *http.Request) {
	type admRP struct {
		Title     string    `json:"title"`
		RPID      string    `json:"rpid"`
		Timestamp time.Time `json:"timestamp"`
	}
	res := []admRP{}
	json.NewEncoder(w).Encode(res)
}

func adminRPInfo(w http.ResponseWriter, r *http.Request) {
	type urlInfo struct {
		URL    string `json:"url"`
		Access string `json:"access"`
	}
	res := []urlInfo{}
	json.NewEncoder(w).Encode(res)
}

func adminDeleteRP(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(204)
}

func adminDeleteLink(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(204)
}

func adminSetLink(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(204)
}
