package main

import (
	"context"
	"crypto/rand"
	"fmt"
	"log"
	"net/http"
	"os"
	"path"
	"strconv"
	"strings"
	"time"

	"github.com/gorilla/mux"
	"github.com/zieckey/goini"
)

var adminPort = 12789
var adminAddr = fmt.Sprintf("127.0.0.1:%d", adminPort)

type serverConf struct {
	dataDir              string
	port                 int
	ssl                  bool
	sslPort              int
	sslDomain            string
	letsencryptAcceptTOS bool
	letsencryptEmail     string
}

func defaultServerConf() *serverConf {
	return &serverConf{
		dataDir: "/var/local/rpnow",
		port:    80,
		ssl:     false,
		sslPort: 443,
	}
}

func (s *serverConf) loadFromINI(filename string) {
	ini := goini.New()
	if err := ini.ParseFile(filename); err != nil {
		log.Fatalf("parse INI file %v failed : %v\n", filename, err.Error())
	}

	if val, ok := ini.Get("dataDir"); ok {
		s.dataDir = val
	}

	if val, ok := ini.GetInt("port"); ok {
		s.port = val
	}

	if val, ok := ini.GetBool("ssl"); ok {
		s.ssl = val
	}

	if val, ok := ini.GetInt("sslPort"); ok {
		s.sslPort = val
	}

	if val, ok := ini.Get("sslDomain"); ok {
		s.sslDomain = val
	}

	if val, ok := ini.GetBool("letsencryptAcceptTOS"); ok {
		s.letsencryptAcceptTOS = val
	}

	if val, ok := ini.Get("letsencryptEmail"); ok {
		s.letsencryptEmail = val
	}
}

func (s *serverConf) loadFromEnv() {
	if val := os.Getenv("RPNOW_DATA_DIR"); val != "" {
		s.dataDir = val
	}

	if val, err := strconv.Atoi(os.Getenv("RPNOW_PORT")); err == nil {
		s.port = val
	}

	if val := strings.ToLower(os.Getenv("RPNOW_SSL")); val == "true" || val == "false" {
		s.ssl = (val == "true")
	}

	if val, err := strconv.Atoi(os.Getenv("RPNOW_SSL_PORT")); err == nil {
		s.sslPort = val
	}

	if val := os.Getenv("RPNOW_SSL_DOMAIN"); val != "" {
		s.sslDomain = val
	}

	if val := strings.ToLower(os.Getenv("RPNOW_LETSENCRYPT_ACCEPT_TOS")); val == "true" || val == "false" {
		s.letsencryptAcceptTOS = (val == "true")
	}

	if val := os.Getenv("RPNOW_LETSENCRYPT_EMAIL"); val != "" {
		s.letsencryptEmail = val
	}
}

type Server struct {
	conf      *serverConf
	db        *database
	jwtSecret []byte
}

func (s *Server) getJWTSecret() []byte {
	if s.jwtSecret != nil {
		s.initJWTSecret()
	}
	return s.jwtSecret
}

func (s *Server) initJWTSecret() {
	if secret := s.db.getJWTSecret(); secret != nil {
		s.jwtSecret = secret
		return
	}
	secret := make([]byte, 256/8)
	if _, err := rand.Read(secret); err != nil {
		log.Fatalf("Failed to generate JWT secret")
	}
	s.db.putJWTSecret(secret)
	s.jwtSecret = secret
}

func (s *Server) run() func() {
	started := make(chan bool)
	stopped := make(chan bool)
	done := make(chan bool)

	go func() {
		defer func() {
			stopped <- true
		}()

		// db setup
		s.db = openDB(path.Join(s.conf.dataDir, "rpnow.boltdb"))
		defer func() {
			if err := s.db.close(); err != nil {
				log.Fatalf("Error: db.close: %s\n", err)
			}
			log.Println("Database closed")
		}()

		// listen
		addr := fmt.Sprintf(":%d", s.conf.port)
		closeAdminServer := serveRouter(s.adminRouter(), adminAddr)
		defer closeAdminServer()
		closeClientServer := serveRouter(s.clientRouter(), addr)
		defer closeClientServer()

		// server is ready
		log.Printf("Listening on %s\n", addr)

		// alert parent that we are started
		started <- true

		// wait until we should be done
		<-done
	}()

	// wait until runner goroutine signals we are ready
	<-started

	return func() {
		done <- true
		<-stopped
	}
}

func serveRouter(router *mux.Router, addr string) func() {
	// listen
	srv := &http.Server{
		Addr: addr,
		// Good practice to set timeouts to avoid Slowloris attacks.
		WriteTimeout:      time.Second * 15,
		ReadHeaderTimeout: time.Second * 15,
		IdleTimeout:       time.Second * 60,
		Handler:           router, // Pass our instance of gorilla/mux in.
	}
	go func() {
		if err := srv.ListenAndServe(); err != http.ErrServerClosed {
			log.Fatalf("listen and serve: %s\n", err)
		}
	}()
	// return shutdown function
	return func() {
		ctx, cancel := context.WithTimeout(context.Background(), time.Second*5)
		defer cancel()

		if err := srv.Shutdown(ctx); err != nil {
			log.Fatalf("http shutdown: %s\n", err)
		}
		log.Printf("Http server stopped: %s\n", addr)
	}
}
