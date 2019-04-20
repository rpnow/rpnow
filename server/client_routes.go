package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/dgrijalva/jwt-go"
	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"
	gonanoid "github.com/matoous/go-nanoid"
	"github.com/rs/xid"
)

var wsUpgrader = websocket.Upgrader{}

func (s *Server) clientRouter() *mux.Router {
	// create router
	router := mux.NewRouter().StrictSlash(true)

	// api
	api := router.PathPrefix("/api").Subrouter()
	api.HandleFunc("/health", health).Methods("GET")
	api.HandleFunc("/dashboard", s.handleDashboard).Methods("POST")
	api.HandleFunc("/rp", s.auth(s.handleCreateRP)).Methods("POST")
	api.HandleFunc("/rp/import", s.auth(s.handleImportJSON)).Methods("POST")
	api.HandleFunc("/user", s.handleCreateUser).Methods("POST")
	api.HandleFunc("/user/verify", s.auth(s.handleVerifyUser)).Methods("GET")
	roomAPI := api.PathPrefix("/rp/{slug:[-0-9a-zA-Z]+}").Subrouter()
	roomAPI.HandleFunc("/chat", s.handleRPChatStream).Methods("GET")
	roomAPI.HandleFunc("/pages", s.handleRPReadIndex).Methods("GET")
	roomAPI.HandleFunc("/pages/{pageNum:[1-9][0-9]*}", s.handleRPReadPage).Methods("GET")
	roomAPI.HandleFunc("/download.txt", s.handleRPExportTxt).Methods("GET").Queries("includeOOC", "{includeOOC:true}")
	roomAPI.HandleFunc("/download.txt", s.handleRPExportTxt).Methods("GET")
	roomAPI.HandleFunc("/export", s.handleRPExportJSON).Methods("GET")
	roomAPI.HandleFunc("/msgs", s.auth(s.handleRPSendMsg)).Methods("POST")
	roomAPI.HandleFunc("/charas", s.auth(s.handleRPSendChara)).Methods("POST")
	roomAPI.HandleFunc("/msgs/{docId:[0-9a-z]+}", s.auth(s.handleRPUpdateMsg)).Methods("PUT")
	roomAPI.HandleFunc("/charas/{docId:[0-9a-z]+}", s.auth(s.handleRPUpdateChara)).Methods("PUT")
	roomAPI.HandleFunc("/msgs/{docId:[0-9a-z]+}/history", s.handleRPGetMsgHistory).Methods("GET")
	roomAPI.HandleFunc("/charas/{docId:[0-9a-z]+}/history", s.handleRPGetCharaHistory).Methods("GET")
	api.PathPrefix("/").HandlerFunc(apiMalformed)

	// routes
	router.HandleFunc("/", indexHTML).Methods("GET")
	router.HandleFunc("/import", indexHTML).Methods("GET")
	router.HandleFunc("/format", indexHTML).Methods("GET")
	router.HandleFunc("/rp/{rpCode}", indexHTML).Methods("GET")
	router.HandleFunc("/read/{rpCode}", indexHTML).Methods("GET")
	router.HandleFunc("/read/{rpCode}/page/{page}", indexHTML).Methods("GET")

	// assets
	router.PathPrefix("/").Handler(http.FileServer(StaticAssets))

	return router
}

func health(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintln(w, `{"rpnow":"ok"}`)
}

func (s *Server) handleDashboard(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintln(w, `{"canCreate":true,"canImport":true}`)
}

func generateRpid() string {
	return "rp_" + xid.New().String()
}

func generateSlug(title string, len int) string {
	slug, err := gonanoid.Generate("abcdefhjknpstxyz23456789", len)
	if err != nil {
		panic(err)
	}
	slug = strings.Join(regexp.MustCompile("....").FindAllString(slug, -1), "-")
	if title == "" {
		return slug
	}
	sluggedTitle := regexp.MustCompile("[^a-z0-9]+").ReplaceAllString(strings.ToLower(title), "-")
	return sluggedTitle + "-" + slug
}

func (s *Server) handleCreateRP(w http.ResponseWriter, r *http.Request, userid string) {
	// parse rp header fields
	var header struct {
		Title string
	}
	err := json.NewDecoder(r.Body).Decode(&header)
	if err != nil {
		http.Error(w, err.Error(), 400)
		return
	}

	slug := generateSlug("", 20)
	readSlug := generateSlug(header.Title, 12)
	rpid := generateRpid()

	// add to db
	s.db.addSlugInfo(&SlugInfo{slug, rpid, "normal"})
	s.db.addSlugInfo(&SlugInfo{readSlug, rpid, "read"})
	s.db.addRoomInfo(&RoomInfo{rpid, header.Title, readSlug, time.Now()})
	// tell user the created response slug
	json.NewEncoder(w).Encode(map[string]string{"rpCode": slug})
}

func (s *Server) handleRPChatStream(w http.ResponseWriter, r *http.Request) {
	var rp struct {
		*RoomInfo
		Messages []RpMessage `json:"msgs"`
		Charas   []RpChara   `json:"charas"`
	}
	// parse slug
	params := mux.Vars(r)

	// get rpid from slug
	slugInfo := s.db.getSlugInfo(params["slug"])
	if slugInfo == nil {
		http.Error(w, fmt.Sprintf("Room not found: %s", params["slug"]), 404)
		return
	}

	rp.RoomInfo = s.db.getRoomInfo(slugInfo.Rpid)

	rp.Messages = s.db.getRecentMsgs(slugInfo.Rpid)
	rp.Charas = s.db.getCharas(slugInfo.Rpid)

	conn, err := wsUpgrader.Upgrade(w, r, nil)
	if err != nil {
		// wsUpgrader already sent an error to the client
		return
	}
	defer conn.Close()

	js, _ := json.Marshal(rp)
	firstPacket := chatStreamMessage{"init", js}

	join(conn, slugInfo.Rpid, firstPacket)
}

func (s *Server) handleRPSendThing(w http.ResponseWriter, r *http.Request, userid string, updateType string, obj Doc) {
	// generate key for new object
	obj.Meta().ID = xid.New().String()

	params := mux.Vars(r)

	slugInfo := s.db.getSlugInfo(params["slug"])
	if slugInfo == nil {
		http.Error(w, fmt.Sprintf("Room not found: %s", params["slug"]), 404)
		return
	}
	if slugInfo.Access != "normal" {
		http.Error(w, "No chat access on "+params["slug"], 403)
		return
	}

	// populate received body
	if err := obj.ParseBody(r.Body); err != nil {
		http.Error(w, err.Error(), 400)
		return
	}
	// validate
	if err := obj.Validate(); err != nil {
		http.Error(w, err.Error(), 400)
		return
	}
	// check object's relationship to other objects
	if err := obj.CheckRelations(slugInfo.Rpid, s.db); err != nil {
		http.Error(w, err.Error(), 400)
		return
	}

	// More
	obj.Meta().Timestamp = time.Now()
	obj.Meta().Userid = userid
	obj.Meta().Revision = 0

	// Add to DB
	s.db.putMsgOrChara(updateType, slugInfo.Rpid, obj)

	// Broadcast
	js, _ := json.Marshal(obj)
	rooms[slugInfo.Rpid].broadcast <- chatStreamMessage{updateType, js}

	// Done
	w.WriteHeader(204)
}

func (s *Server) handleRPSendMsg(w http.ResponseWriter, r *http.Request, userid string) {
	s.handleRPSendThing(w, r, userid, "msgs", NewRpMessage())
}

func (s *Server) handleRPSendChara(w http.ResponseWriter, r *http.Request, userid string) {
	s.handleRPSendThing(w, r, userid, "charas", NewRpChara())
}

func (s *Server) handleRPUpdateThing(w http.ResponseWriter, r *http.Request, userid string, updateType string, getOldDoc func(rpid string, id string) Doc) {
	params := mux.Vars(r)

	slugInfo := s.db.getSlugInfo(params["slug"])
	if slugInfo == nil {
		http.Error(w, fmt.Sprintf("Room not found: %s", params["slug"]), 404)
		return
	}
	if slugInfo.Access != "normal" {
		http.Error(w, "No chat access on "+params["slug"], 403)
		return
	}

	obj := getOldDoc(slugInfo.Rpid, params["docId"])
	if obj == nil {
		http.Error(w, fmt.Sprintf("No document to edit: %s/%s", slugInfo.Rpid, params["docId"]), 404)
		return
	}

	// Store previous revision
	s.db.putMsgOrCharaRevision(updateType, slugInfo.Rpid, obj)

	// populate received body
	if err := obj.ParseBody(r.Body); err != nil {
		http.Error(w, err.Error(), 400)
		return
	}
	// validate
	if err := obj.Validate(); err != nil {
		http.Error(w, err.Error(), 400)
		return
	}
	// check object's relationship to other objects
	if err := obj.CheckRelations(slugInfo.Rpid, s.db); err != nil {
		http.Error(w, err.Error(), 400)
		return
	}

	// More
	obj.Meta().Timestamp = time.Now()
	obj.Meta().Userid = userid
	obj.Meta().Revision++

	// Update DB
	s.db.putMsgOrChara(updateType, slugInfo.Rpid, obj)

	// Broadcast
	js, _ := json.Marshal(obj)
	rooms[slugInfo.Rpid].broadcast <- chatStreamMessage{updateType, js}

	// Done
	w.WriteHeader(204)
}

func (s *Server) handleRPUpdateMsg(w http.ResponseWriter, r *http.Request, userid string) {
	s.handleRPUpdateThing(w, r, userid, "msgs", func(rpid string, id string) Doc {
		return s.db.getMsg(rpid, id)
	})
}

func (s *Server) handleRPUpdateChara(w http.ResponseWriter, r *http.Request, userid string) {
	s.handleRPUpdateThing(w, r, userid, "charas", func(rpid string, id string) Doc {
		return s.db.getChara(rpid, id)
	})
}

func (s *Server) handleRPGetThingHistory(w http.ResponseWriter, r *http.Request, thingType string) {
	params := mux.Vars(r)

	slugInfo := s.db.getSlugInfo(params["slug"])
	if slugInfo == nil {
		http.Error(w, fmt.Sprintf("Room not found: %s", params["slug"]), 404)
		return
	}

	id := params["docId"]

	docRevisions := s.db.getMsgOrCharaRevisions(thingType, slugInfo.Rpid, id)

	// bounce it back and send
	json.NewEncoder(w).Encode(docRevisions)
}

func (s *Server) handleRPGetMsgHistory(w http.ResponseWriter, r *http.Request) {
	s.handleRPGetThingHistory(w, r, "msgs")
}

func (s *Server) handleRPGetCharaHistory(w http.ResponseWriter, r *http.Request) {
	s.handleRPGetThingHistory(w, r, "charas")
}

func (s *Server) handleRPReadIndex(w http.ResponseWriter, r *http.Request) {
	var idx struct {
		Title     string `json:"title"`
		PageCount int    `json:"pageCount"`
	}

	// parse slug
	params := mux.Vars(r)

	// get rpid from slug
	slugInfo := s.db.getSlugInfo(params["slug"])
	if slugInfo == nil {
		http.Error(w, fmt.Sprintf("Room not found: %s", params["slug"]), 404)
		return
	}

	idx.Title = s.db.getRoomInfo(slugInfo.Rpid).Title
	idx.PageCount = s.db.countRoomPages(slugInfo.Rpid)

	// bounce it back and send
	json.NewEncoder(w).Encode(idx)
}

func (s *Server) handleRPReadPage(w http.ResponseWriter, r *http.Request) {
	var idx struct {
		Title     string      `json:"title"`
		PageCount int         `json:"pageCount"`
		Messages  []RpMessage `json:"msgs"`
		Charas    []RpChara   `json:"charas"`
	}

	// parse slug
	params := mux.Vars(r)

	// get rpid from slug
	slugInfo := s.db.getSlugInfo(params["slug"])
	if slugInfo == nil {
		http.Error(w, fmt.Sprintf("Room not found: %s", params["slug"]), 404)
		return
	}

	// validate page number
	pageNum, err := strconv.Atoi(params["pageNum"])
	if err != nil {
		http.Error(w, fmt.Sprintf("Invalid page number: %s", params["pageNum"]), 400)
		return
	}

	idx.Title = s.db.getRoomInfo(slugInfo.Rpid).Title
	idx.PageCount = s.db.countRoomPages(slugInfo.Rpid)
	idx.Messages = s.db.getPageMsgs(slugInfo.Rpid, pageNum)
	idx.Charas = s.db.getCharas(slugInfo.Rpid)

	// bounce it back and send
	json.NewEncoder(w).Encode(idx)
}

func (s *Server) handleRPExportTxt(w http.ResponseWriter, r *http.Request) {
	// parse slug
	params := mux.Vars(r)

	// get rpid from slug
	slugInfo := s.db.getSlugInfo(params["slug"])
	if slugInfo == nil {
		http.Error(w, fmt.Sprintf("Room not found: %s", params["slug"]), 404)
		return
	}

	// Write title
	title := s.db.getRoomInfo(slugInfo.Rpid).Title
	w.Header().Add("Content-Disposition", "attachment; filename=\""+strings.ToLower(title)+".txt\"")
	w.Write([]byte(title + "\r\n\r\n----------\r\n\r\n"))

	// map of charas by id
	charas := s.db.getCharas(slugInfo.Rpid)
	charasMap := map[string]*RpChara{}
	for _, chara := range charas {
		charasMap[chara.ID] = &chara
	}

	// include ooc messages?
	includeOOCParam, includeOOCinMap := params["includeOOC"]
	includeOOC := includeOOCinMap && includeOOCParam != "false"

	// get msgs from db cursor
	msgs, errs := s.db.getAllMsgs(slugInfo.Rpid)
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
		log.Fatalln(err)
	}
}

func (s *Server) handleRPExportJSON(w http.ResponseWriter, r *http.Request) {
	var rpMeta exportFirstBlock

	// parse slug
	params := mux.Vars(r)

	// get rpid from slug
	slugInfo := s.db.getSlugInfo(params["slug"])
	if slugInfo == nil {
		http.Error(w, fmt.Sprintf("Room not found: %s", params["slug"]), 404)
		return
	}

	// Get title
	title := s.db.getRoomInfo(slugInfo.Rpid).Title
	rpMeta.Title = title

	// map of charas by id
	charas := s.db.getCharas(slugInfo.Rpid)
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
	msgs, errs := s.db.getAllMsgs(slugInfo.Rpid)
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
		log.Fatalln(err)
	}

	// done
	w.Write([]byte("\n]\n"))
}

func (s *Server) handleImportJSON(w http.ResponseWriter, r *http.Request, userid string) {
	// open file sent through "file" multiform param
	file, _, err := r.FormFile("file")
	if err != nil {
		http.Error(w, err.Error(), 400)
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

	slug := generateSlug("", 20)
	readSlug := generateSlug(meta.Title, 12)
	rpid := generateRpid()

	s.db.addSlugInfo(&SlugInfo{slug, rpid, "normal"})
	s.db.addSlugInfo(&SlugInfo{readSlug, rpid, "read"})
	s.db.addRoomInfo(&RoomInfo{rpid, meta.Title, readSlug, time.Now()})

	charas := make([]RpChara, len(meta.Charas))
	for i, rawChara := range meta.Charas {
		chara := NewRpChara()
		chara.RpCharaBody = rawChara.RpCharaBody
		chara.Timestamp = rawChara.Timestamp
		chara.ID = xid.New().String()
		chara.Userid = userid
		chara.Revision = 0
		charas[i] = chara
		if err := chara.Validate(); err != nil {
			http.Error(w, err.Error(), 400)
			return
		}
		s.db.putChara(rpid, &chara)
	}

	// read all remaining elements in the array as msgs
	var wg sync.WaitGroup
	for dec.More() {
		var rawMsg exportMessage

		if err := dec.Decode(&rawMsg); err != nil {
			http.Error(w, err.Error(), 400)
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
		msg.Userid = userid
		msg.Revision = 0

		if err := msg.Validate(); err != nil {
			http.Error(w, err.Error(), 400)
			return
		}
		wg.Add(1)
		go func(msg *RpMessage) {
			s.db.putMsg(rpid, msg)
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

func (s *Server) handleCreateUser(w http.ResponseWriter, r *http.Request) {
	var res struct {
		UserID string `json:"userid"`
		Token  string `json:"token"`
	}

	res.UserID = "anon:" + xid.New().String()

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub": res.UserID,
		"jti": xid.New().String(),
		"iat": time.Now().Unix(),
	})

	tokenString, err := token.SignedString(s.jwtSecret)
	if err != nil {
		log.Fatalln(err)
	}
	res.Token = tokenString

	json.NewEncoder(w).Encode(res)
}

func (s *Server) auth(fn func(http.ResponseWriter, *http.Request, string)) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			http.Error(w, "Missing Authorization header", 401)
			return
		}

		authHeaderParts := strings.Split(authHeader, " ")
		if len(authHeaderParts) != 2 || strings.ToLower(authHeaderParts[0]) != "bearer" {
			http.Error(w, "Authorization header format must be Bearer {token}", 400)
			return
		}

		tokenString := authHeaderParts[1]

		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("Unexpected signing method: %v", token.Header["alg"])
			}
			return s.jwtSecret, nil
		})
		if err != nil {
			http.Error(w, err.Error(), 400)
			return
		}

		if !token.Valid {
			http.Error(w, "Token expired", 401)
			return
		}

		userid := token.Claims.(jwt.MapClaims)["sub"].(string)

		fn(w, r, userid)
	}
}

func (s *Server) handleVerifyUser(w http.ResponseWriter, r *http.Request, _ string) {
	w.WriteHeader(http.StatusNoContent)
}

func indexHTML(w http.ResponseWriter, r *http.Request) {
	file, err := StaticAssets.Open("index.html")
	if err != nil {
		log.Fatalln(err)
	}
	stat, err := file.Stat()
	if err != nil {
		log.Fatalln(err)
	}
	http.ServeContent(w, r, "index.html", stat.ModTime(), file)
}

func apiMalformed(w http.ResponseWriter, r *http.Request) {
	http.Error(w, "Malformed request", 400)
}
