package main

import (
	"fmt"
	"log"
	"net/http"

	"github.com/gorilla/mux"
)

func main() {
	router := mux.NewRouter().StrictSlash(true)
	router.HandleFunc("/", index).Methods("GET")
	router.HandleFunc("/todos", todoIndex)
	router.HandleFunc("/todos/{todoId}", todoShow)
	router.PathPrefix("/").Handler(http.FileServer(http.Dir("src/static")))

	log.Fatal(http.ListenAndServe(":8080", router))
}

func index(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintln(w, "Welcome!")
}

func todoIndex(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintln(w, "Todo Index!")
}

func todoShow(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	todoId := vars["todoId"]
	fmt.Fprintln(w, "Todo show:", todoId)
}
