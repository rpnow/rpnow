package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"time"

	"github.com/gorilla/mux"
)

func (s *Server) adminRouter() *mux.Router {
	// create router
	router := mux.NewRouter().StrictSlash(true)

	router.HandleFunc("/status", s.handleAdminStatus).Methods("GET")
	router.HandleFunc("/rps", s.handleAdminRPList).Methods("GET")
	router.HandleFunc("/rps/{slug:[-0-9a-zA-Z]+}", s.handleAdminRPInfo).Methods("GET")
	router.HandleFunc("/rps/{slug:[-0-9a-zA-Z]+}", s.handleAdminDeleteRP).Methods("DELETE")
	router.HandleFunc("/url/{url}", s.handleAdminDeleteLink).Methods("DELETE")
	router.HandleFunc("/url/{url}", s.handleAdminSetLink).Methods("PUT")
	router.PathPrefix("/").HandlerFunc(apiMalformed)

	return router
}

func (s *Server) handleAdminStatus(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintf(w, `{"rpnow":"ok","pid":%d}`, os.Getpid())
}

func (s *Server) handleAdminRPList(w http.ResponseWriter, r *http.Request) {
	type admRP struct {
		Title     string    `json:"title"`
		RPID      string    `json:"rpid"`
		Timestamp time.Time `json:"timestamp"`
	}
	res := []admRP{}
	json.NewEncoder(w).Encode(res)
}

func (s *Server) handleAdminRPInfo(w http.ResponseWriter, r *http.Request) {
	type urlInfo struct {
		URL    string `json:"url"`
		Access string `json:"access"`
	}
	res := []urlInfo{}
	json.NewEncoder(w).Encode(res)
}

func (s *Server) handleAdminDeleteRP(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(204)
}

func (s *Server) handleAdminDeleteLink(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(204)
}

func (s *Server) handleAdminSetLink(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(204)
}
