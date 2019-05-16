package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	"golang.org/x/crypto/bcrypt"

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
	api.HandleFunc("/dashboard", s.auth(s.handleDashboard)).Methods("POST")
	api.HandleFunc("/rp", s.auth(s.handleCreateRP)).Methods("POST")
	api.HandleFunc("/rp/import", s.auth(s.handleImportJSON)).Methods("POST")
	api.HandleFunc("/user", s.handleCreateUser).Methods("POST")
	api.HandleFunc("/user/login", s.handleLogin).Methods("POST")
	api.HandleFunc("/user/verify", s.auth(s.handleVerifyUser)).Methods("GET")
	api.HandleFunc("/user/anon", s.handleGenerateAnonLogin).Methods("POST")
	api.HandleFunc("/user/rp/{slug:[-0-9a-zA-Z]+}", s.auth(s.handleAddRpToUser)).Methods("POST")
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
	roomAPI.HandleFunc("/title", s.handleRPSetTitle).Methods("PUT")
	roomAPI.HandleFunc("/webhook", s.handleRPSetWebhook).Methods("PUT")
	api.PathPrefix("/").HandlerFunc(apiMalformed)

	// routes
	router.HandleFunc("/", indexHTML).Methods("GET")
	router.HandleFunc("/login", indexHTML).Methods("GET")
	router.HandleFunc("/register", indexHTML).Methods("GET")
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

func (s *Server) canCreateRP(auth authContext) bool {
	switch auth.userType {
	case "admin":
		return true
	case "anon":
		return !s.getSecurityPolicy().RestrictCreate
	case "user":
		return auth.user.CanCreate || !s.getSecurityPolicy().RestrictCreate
	default:
		log.Fatalf("Unknown user type: %s\n", auth.userType)
		return false
	}
}

func (s *Server) handleDashboard(w http.ResponseWriter, r *http.Request, auth authContext) {
	type dashboardRoom struct {
		Slug    string    `json:"rpCode"`
		Title   string    `json:"title"`
		Updated time.Time `json:"updated"`
	}
	var res struct {
		CanCreate bool            `json:"canCreate"`
		Rooms     []dashboardRoom `json:"rooms"`
	}

	res.CanCreate = s.canCreateRP(auth)

	res.Rooms = []dashboardRoom{}
	if auth.userType == "user" {
		for _, slug := range auth.user.RoomSlugs {
			slugInfo := s.db.getSlugInfo(slug)
			roomInfo := s.db.getRoomInfo(slugInfo.Rpid)
			lastMsg := s.db.getLastMsg(roomInfo.RPID)
			if lastMsg == nil {
				res.Rooms = append(res.Rooms, dashboardRoom{slug, roomInfo.Title, roomInfo.CreatedAt})
			} else {
				res.Rooms = append(res.Rooms, dashboardRoom{slug, roomInfo.Title, lastMsg.Timestamp})
			}
		}
		sort.Slice(res.Rooms, func(i, j int) bool {
			return res.Rooms[i].Updated.After(res.Rooms[j].Updated)
		})
	}

	json.NewEncoder(w).Encode(res)
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

func (s *Server) handleCreateRP(w http.ResponseWriter, r *http.Request, auth authContext) {
	if !s.canCreateRP(auth) {
		http.Error(w, "Insufficient privileges to create an RP", 403)
		return
	}

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

	roomInfo := &RoomInfo{
		RPID:      rpid,
		Title:     header.Title,
		ReadCode:  readSlug,
		CreatedAt: time.Now(),
		Userid:    auth.userid(),
	}

	if err := roomInfo.Validate(); err != nil {
		http.Error(w, err.Error(), 400)
		return
	}

	// add to db
	s.db.addSlugInfo(&SlugInfo{slug, rpid, "normal"})
	s.db.addSlugInfo(&SlugInfo{readSlug, rpid, "read"})
	s.db.addRoomInfo(roomInfo)
	// tell user the created response slug
	json.NewEncoder(w).Encode(map[string]string{"rpCode": slug})
}

func (s *Server) handleRPSetInfo(w http.ResponseWriter, r *http.Request, modify func(*RoomInfo)) {
	// parse slug
	params := mux.Vars(r)

	// get rpid from slug
	slugInfo := s.db.getSlugInfo(params["slug"])
	if slugInfo == nil {
		http.Error(w, fmt.Sprintf("Room not found: %s", params["slug"]), 404)
		return
	}

	// update room info
	roomInfo := s.db.getRoomInfo(slugInfo.Rpid)
	modify(roomInfo)
	if err := roomInfo.Validate(); err != nil {
		http.Error(w, err.Error(), 400)
		return
	}
	s.db.addRoomInfo(roomInfo)

	// done
	w.WriteHeader(204)
}

func (s *Server) handleRPSetTitle(w http.ResponseWriter, r *http.Request) {
	// parse request
	var header struct {
		Title string
	}
	err := json.NewDecoder(r.Body).Decode(&header)
	if err != nil {
		http.Error(w, err.Error(), 400)
		return
	}

	s.handleRPSetInfo(w, r, func(roomInfo *RoomInfo) {
		roomInfo.Title = header.Title
	})
}

func (s *Server) handleRPSetWebhook(w http.ResponseWriter, r *http.Request) {
	// parse request
	var header struct {
		Webhook string
	}
	err := json.NewDecoder(r.Body).Decode(&header)
	if err != nil {
		http.Error(w, err.Error(), 400)
		return
	}

	// test webhook
	webhookTestBody := bytes.NewReader([]byte(`{"content":"Webhook test successful"}`))
	resp, err := http.Post(header.Webhook, "application/json", webhookTestBody)
	if err != nil {
		http.Error(w, "Webhook test failed: "+err.Error(), 400)
		return
	}
	if resp.StatusCode >= 400 {
		http.Error(w, fmt.Sprintf("Webhook test failed: Got status code %d", resp.StatusCode), 400)
		return
	}

	s.handleRPSetInfo(w, r, func(roomInfo *RoomInfo) {
		roomInfo.Webhook = header.Webhook
	})
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

func (s *Server) handleRPSendThing(w http.ResponseWriter, r *http.Request, userid string, updateType string, obj Doc, next func()) {
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
	w.Write(js)

	// Anything to execute afterwards
	next()
}

func (s *Server) handleRPSendMsg(w http.ResponseWriter, r *http.Request, auth authContext) {
	msg := NewRpMessage()
	s.handleRPSendThing(w, r, auth.userid(), "msgs", &msg, func() {
		slugInfo := s.db.getSlugInfo(mux.Vars(r)["slug"])
		roomInfo := s.db.getRoomInfo(slugInfo.Rpid)

		bodyText := ""
		if auth.userType == "user" {
			bodyText = "[" + auth.username + "] New " + msg.Type + " message! "
		} else {
			bodyText = "New " + msg.Type + " message: "
		}
		if msg.Type != "image" {
			contentRunes := []rune(msg.Content)
			if len(contentRunes) > 20 {
				bodyText += string(contentRunes[:20]) + "..."
			} else {
				bodyText += msg.Content
			}
		}

		embed := map[string]string {
			"title": bodyText,
		}
		if s.conf.ssl {
			embed["url"] = "https://"+s.conf.sslDomain+"/rp/"+slugInfo.Slug
		}
		body := map[string]interface{}{"embeds":[]map[string]string{embed}}

		bodyBytes, _ := json.Marshal(body)
		http.Post(roomInfo.Webhook, "application/json", bytes.NewReader(bodyBytes))
	})
}

func (s *Server) handleRPSendChara(w http.ResponseWriter, r *http.Request, auth authContext) {
	s.handleRPSendThing(w, r, auth.userid(), "charas", NewRpChara(), func() {})
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

func (s *Server) handleRPUpdateMsg(w http.ResponseWriter, r *http.Request, auth authContext) {
	s.handleRPUpdateThing(w, r, auth.userid(), "msgs", func(rpid string, id string) Doc {
		return s.db.getMsg(rpid, id)
	})
}

func (s *Server) handleRPUpdateChara(w http.ResponseWriter, r *http.Request, auth authContext) {
	s.handleRPUpdateThing(w, r, auth.userid(), "charas", func(rpid string, id string) Doc {
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

func (s *Server) handleImportJSON(w http.ResponseWriter, r *http.Request, auth authContext) {
	if !s.canCreateRP(auth) {
		http.Error(w, "Insufficient privileges to create an RP", 403)
		return
	}

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

	roomInfo := &RoomInfo{
		RPID:      rpid,
		Title:     meta.Title,
		ReadCode:  readSlug,
		CreatedAt: time.Now(),
		Userid:    auth.userid(),
	}

	if err := roomInfo.Validate(); err != nil {
		http.Error(w, err.Error(), 400)
		return
	}

	s.db.addSlugInfo(&SlugInfo{slug, rpid, "normal"})
	s.db.addSlugInfo(&SlugInfo{readSlug, rpid, "read"})
	s.db.addRoomInfo(roomInfo)

	charas := make([]RpChara, len(meta.Charas))
	for i, rawChara := range meta.Charas {
		chara := NewRpChara()
		chara.RpCharaBody = rawChara.RpCharaBody
		chara.Timestamp = rawChara.Timestamp
		chara.ID = xid.New().String()
		chara.Userid = auth.userid()
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
		msg.Userid = auth.userid()
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
	if s.db.countUsers() >= s.getSecurityPolicy().UserQuota {
		http.Error(w, "Too many registered users! The admin should delete some users or increase the registration limit.", 400)
		return
	}

	// parse user registration
	var header struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}
	err := json.NewDecoder(r.Body).Decode(&header)
	if err != nil {
		http.Error(w, err.Error(), 400)
		return
	}

	// Validate
	// TODO decide on username regex
	if !regexp.MustCompile(`^\w{1,30}$`).MatchString(header.Username) {
		http.Error(w, "Invalid username", 400)
		return
	}
	if strings.TrimSpace(header.Username) != header.Username {
		http.Error(w, "Username must not have leading or trailing whitespace", 400)
		return
	}
	if len(header.Password) < 6 {
		http.Error(w, "Password must be at least 6 characters", 400)
		return
	}
	if len(header.Password) > 100 {
		http.Error(w, "Password must be 100 characters or less", 400)
		return
	}

	// Check if username is taken
	if s.db.getUser(header.Username) != nil {
		http.Error(w, "Username already taken", 400)
		return
	}

	// Insert into DB
	user := User{Username: header.Username, CanCreate: false}
	user.SetPassword(header.Password)
	s.db.putUser(&user)

	// Now we just login with the same values
	s.handleLoginCommon(w, header.Username, header.Password)
}

func (s *Server) handleLogin(w http.ResponseWriter, r *http.Request) {
	// parse user login
	var header struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}
	err := json.NewDecoder(r.Body).Decode(&header)
	if err != nil {
		http.Error(w, err.Error(), 400)
		return
	}

	s.handleLoginCommon(w, header.Username, header.Password)
}

func (s *Server) handleLoginCommon(w http.ResponseWriter, username string, password string) {
	// get user
	user := s.db.getUser(username)

	// fail if user doesn't exist
	if user == nil {
		DummyCheckPassword(password) // timing attacks may reveal that this user doesn't exist
		http.Error(w, "Invalid credentials", 400)
		return
	}

	// fail if bad password
	if err := user.CheckPassword(password); err != nil {
		if err == bcrypt.ErrMismatchedHashAndPassword {
			http.Error(w, "Invalid credentials", 400)
			return
		}
		log.Fatalln(err)
	}

	// create response with userid and token
	var res struct {
		UserID string `json:"userid"`
		Token  string `json:"token"`
	}

	res.UserID = "user:" + user.Username

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub": res.UserID,
		"jti": xid.New().String(),
		"iat": time.Now().Unix(),
	})

	tokenString, err := token.SignedString(s.getJWTSecret())
	if err != nil {
		log.Fatalln(err)
	}
	res.Token = tokenString

	json.NewEncoder(w).Encode(res)
}

func (s *Server) handleGenerateAnonLogin(w http.ResponseWriter, r *http.Request) {
	var res struct {
		UserID string `json:"userid"`
		Token  string `json:"token"`
		Anon   bool   `json:"anon"`
	}

	res.UserID = "anon:" + xid.New().String()

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub": res.UserID,
		"jti": xid.New().String(),
		"iat": time.Now().Unix(),
	})

	tokenString, err := token.SignedString(s.getJWTSecret())
	if err != nil {
		log.Fatalln(err)
	}
	res.Token = tokenString

	res.Anon = true

	json.NewEncoder(w).Encode(res)
}

type authContext struct {
	userType string
	username string
	user     *User
}

func (auth authContext) userid() string {
	return auth.userType + ":" + auth.username
}

func (s *Server) auth(fn func(http.ResponseWriter, *http.Request, authContext)) http.HandlerFunc {
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
			return s.getJWTSecret(), nil
		})
		if err != nil {
			http.Error(w, err.Error(), 401)
			return
		}

		if !token.Valid {
			http.Error(w, "Token expired", 401)
			return
		}

		userid := token.Claims.(jwt.MapClaims)["sub"].(string)

		var authContext authContext
		useridSegments := strings.SplitN(userid, ":", 2)
		authContext.userType = useridSegments[0]
		authContext.username = useridSegments[1]
		if authContext.userType == "user" {
			authContext.user = s.db.getUser(authContext.username)
			if authContext.user == nil {
				http.Error(w, "User does not exist", 401)
			}
		}

		fn(w, r, authContext)
	}
}

func (s *Server) handleVerifyUser(w http.ResponseWriter, r *http.Request, _ authContext) {
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) handleAddRpToUser(w http.ResponseWriter, r *http.Request, auth authContext) {
	// verify user is logged in
	if auth.userType != "user" {
		http.Error(w, "Can only add RP to logged-in user account", 403)
		return
	}

	// verify slug points to a real room
	slug := mux.Vars(r)["slug"]
	slugInfo := s.db.getSlugInfo(slug)
	if slugInfo == nil {
		http.Error(w, fmt.Sprintf("Room not found: %s", slug), 404)
		return
	}

	user := auth.user

	// make sure slug isn't already attached to user
	for _, existingSlug := range user.RoomSlugs {
		if slug == existingSlug {
			w.WriteHeader(204)
			return
		}
	}

	// add slug to user
	user.RoomSlugs = append(user.RoomSlugs, slug)
	s.db.putUser(user)

	// done
	w.WriteHeader(204)
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
