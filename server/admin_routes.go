package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"

	"github.com/gorilla/mux"
)

func (s *Server) adminRouter() *mux.Router {
	// create router
	router := mux.NewRouter().StrictSlash(true)

	router.HandleFunc("/status", s.handleAdminStatus).Methods("GET")
	router.HandleFunc("/rps", s.handleAdminListRooms).Methods("GET")
	router.HandleFunc("/rp", s.authAdmin(s.handleCreateRP)).Methods("POST")
	router.HandleFunc("/rps/{rpid}", s.handleAdminListRoomLinks).Methods("GET")
	router.HandleFunc("/rps/{rpid}", s.handleAdminDeleteRP).Methods("DELETE")
	router.HandleFunc("/url/{slug}", s.handleAdminDeleteLink).Methods("DELETE")
	router.HandleFunc("/url/{slug}", s.handleAdminSetLink).Methods("PUT")
	router.HandleFunc("/users", s.handleAdminListUsers).Methods("GET")
	router.HandleFunc("/users/{username}/creator", s.handleAdminUpdateUserCanCreate).Methods("POST")
	router.HandleFunc("/security", s.handleAdminGetSecurityPolicy).Methods("GET")
	router.HandleFunc("/security", s.handleAdminPutSecurityPolicy).Methods("PUT")
	router.PathPrefix("/").HandlerFunc(apiMalformed)

	return router
}

func (s *Server) authAdmin(fn func(http.ResponseWriter, *http.Request, authContext)) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		fn(w, r, authContext{userType: "admin", username: "admin"})
	}
}

func (s *Server) handleAdminStatus(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintf(w, `{"rpnow":"ok","pid":%d}`, os.Getpid())
}

func (s *Server) handleAdminListRooms(w http.ResponseWriter, r *http.Request) {
	rooms := s.db.listAllRooms()
	json.NewEncoder(w).Encode(rooms)
}

func (s *Server) handleAdminListUsers(w http.ResponseWriter, r *http.Request) {
	users := s.db.listAllUsers()
	for i := range users {
		users[i].PassHash = nil
	}
	json.NewEncoder(w).Encode(users)
}

func (s *Server) handleAdminListRoomLinks(w http.ResponseWriter, r *http.Request) {
	rpid := mux.Vars(r)["rpid"]
	res := []SlugInfo{}
	for _, link := range s.db.listAllLinks() {
		if link.Rpid == rpid {
			res = append(res, link)
		}
	}
	json.NewEncoder(w).Encode(res)
}

func (s *Server) handleAdminDeleteRP(w http.ResponseWriter, r *http.Request) {
	rpid := mux.Vars(r)["rpid"]
	s.db.purgeRoomMsgs(rpid)
	s.db.purgeRoomCharas(rpid)
	for _, slugInfo := range s.db.listAllLinks() {
		if slugInfo.Rpid == rpid {
			s.db.removeSlugInfo(slugInfo.Slug)
		}
	}
	s.db.removeRoomInfo(rpid)

	w.WriteHeader(204)
}

func (s *Server) handleAdminDeleteLink(w http.ResponseWriter, r *http.Request) {
	slug := mux.Vars(r)["slug"]
	s.db.removeSlugInfo(slug)

	w.WriteHeader(204)
}

func (s *Server) handleAdminSetLink(w http.ResponseWriter, r *http.Request) {
	slugInfo := SlugInfo{}
	err := json.NewDecoder(r.Body).Decode(&slugInfo)
	if err != nil {
		http.Error(w, err.Error(), 400)
		return
	}
	slugInfo.Slug = mux.Vars(r)["slug"]

	s.db.addSlugInfo(&slugInfo)

	w.WriteHeader(204)
}

func (s *Server) handleAdminGetSecurityPolicy(w http.ResponseWriter, r *http.Request) {
	policy := s.getSecurityPolicy()
	json.NewEncoder(w).Encode(policy)
}

func (s *Server) handleAdminPutSecurityPolicy(w http.ResponseWriter, r *http.Request) {
	policy := SecurityPolicy{}
	err := json.NewDecoder(r.Body).Decode(&policy)
	if err != nil {
		http.Error(w, err.Error(), 400)
		return
	}

	s.updateSecurityPolicy(policy)

	w.WriteHeader(204)
}

func (s *Server) handleAdminUpdateUserCanCreate(w http.ResponseWriter, r *http.Request) {
	var canCreate bool
	err := json.NewDecoder(r.Body).Decode(&canCreate)
	if err != nil {
		http.Error(w, err.Error(), 400)
		return
	}

	username := mux.Vars(r)["username"]
	user := s.db.getUser(username)
	if user == nil {
		http.Error(w, "User not found: "+username, 400)
		return
	}

	user.CanCreate = canCreate

	s.db.putUser(user)

	w.WriteHeader(204)
}
