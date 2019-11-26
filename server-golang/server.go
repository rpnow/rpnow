package main

import (
	"context"
	"crypto/rand"
	"crypto/tls"
	"fmt"
	"log"
	"net/http"
	"os"
	"path"
	"strconv"
	"strings"
	"time"

	"golang.org/x/crypto/acme/autocert"

	"github.com/zieckey/goini"
)

var adminPort = 12789
var adminAddr = fmt.Sprintf("127.0.0.1:%d", adminPort)

type serverConf struct {
	dataDir              string
	port                 int
	ssl                  bool
	sslDomain            string
	letsencryptAcceptTOS bool
}

func defaultServerConf() *serverConf {
	return &serverConf{
		dataDir: "/var/local/rpnow",
		ssl:     false,
	}
}

func (s *serverConf) loadFromINI(filename string) {
	ini := goini.New()
	if err := ini.ParseFile(filename); err != nil {
		if os.IsNotExist(err) {
			return
		} else {
			log.Fatalf("parse INI file %v failed : %v\n", filename, err.Error())
		}
	}

	log.Println("Loaded config at "+filename)

	if val, ok := ini.Get("dataDir"); ok {
		s.dataDir = val
	}

	if val, ok := ini.GetInt("port"); ok {
		s.port = val
	}

	if val, ok := ini.GetBool("ssl"); ok {
		s.ssl = val
	}

	if val, ok := ini.Get("sslDomain"); ok {
		s.sslDomain = val
	}

	if val, ok := ini.GetBool("letsencryptAcceptTOS"); ok {
		s.letsencryptAcceptTOS = val
	}
}

func (s *serverConf) loadFromEnv() {
	loadedAny := false

	if val := os.Getenv("RPNOW_DATA_DIR"); val != "" {
		s.dataDir = val
		loadedAny = true
	}

	if val, err := strconv.Atoi(os.Getenv("RPNOW_PORT")); err == nil {
		s.port = val
		loadedAny = true
	}

	if val := strings.ToLower(os.Getenv("RPNOW_SSL")); val == "true" || val == "false" {
		s.ssl = (val == "true")
		loadedAny = true
	}

	if val := os.Getenv("RPNOW_SSL_DOMAIN"); val != "" {
		s.sslDomain = val
		loadedAny = true
	}

	if val := strings.ToLower(os.Getenv("RPNOW_LETSENCRYPT_ACCEPT_TOS")); val == "true" || val == "false" {
		s.letsencryptAcceptTOS = (val == "true")
		loadedAny = true
	}

	if loadedAny {
		log.Println("Loaded some environment values")
	}
}

type Server struct {
	conf              *serverConf
	db                *database
	_securitySettings *SecurityPolicy
	_jwtSecret        []byte
}

func (s *Server) getJWTSecret() []byte {
	if s._jwtSecret == nil {
		s.initJWTSecret()
	}
	return s._jwtSecret
}

func (s *Server) initJWTSecret() {
	if secret := s.db.getJWTSecret(); secret != nil {
		s._jwtSecret = secret
		return
	}
	secret := make([]byte, 256/8)
	if _, err := rand.Read(secret); err != nil {
		log.Fatalf("Failed to generate JWT secret")
	}
	s.db.putJWTSecret(secret)
	s._jwtSecret = secret
}

func (s *Server) getSecurityPolicy() SecurityPolicy {
	if s._securitySettings == nil {
		s.initSecurityPolicy()
	}
	return *s._securitySettings
}

func (s *Server) initSecurityPolicy() {
	if settings := s.db.getSecurityPolicy(); settings != nil {
		s._securitySettings = settings
		return
	}
	settings := &SecurityPolicy{RestrictCreate: true, UserQuota: 20}
	s.db.putSecurityPolicy(settings)
	s._securitySettings = settings
}

func (s *Server) updateSecurityPolicy(settings SecurityPolicy) {
	s.db.putSecurityPolicy(&settings)
	s._securitySettings = &settings
}

func (s *Server) run() func() {
	// test if we're already running
	if up, pid, err := isServerUp(); up {
		log.Fatalf("RPNow is already running (PID %d)\n", pid)
	} else if err != nil {
		log.Fatalf("RPNow seems to be running (PID %d) but is not responding correctly\n", pid)
	}

	started := make(chan bool)
	stopped := make(chan bool)
	done := make(chan bool)

	// interpret config
	port := s.conf.port
	if port == 0 {
		if s.conf.ssl {
			port = 443
		} else {
			port = 80
		}
	}
	addr := fmt.Sprintf(":%d", port)

	var autocertManager *autocert.Manager

	if s.conf.ssl {
		if !s.conf.letsencryptAcceptTOS {
			log.Fatalf("Error: must accept letsencrypt TOS")
		}

		certDir := path.Join(s.conf.dataDir, "autocert")
		if err := os.Mkdir(certDir, 0755); err != nil && !os.IsExist(err) {
			log.Fatalf("Failed to create autocert cache directory")
		}

		autocertManager = &autocert.Manager{
			Prompt:     autocert.AcceptTOS,
			HostPolicy: autocert.HostWhitelist(s.conf.sslDomain),
			Cache:      autocert.DirCache(certDir),
		}

	}

	// run server
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

		// internal server: listen
		closeAdminServer := serveRouter(s.adminRouter(), adminAddr, nil)
		defer closeAdminServer()

		// public server: listen
		if s.conf.ssl {
			closeAcmeHandler := serveRouter(autocertManager.HTTPHandler(nil), ":80", nil)
			defer closeAcmeHandler()
			closeClientServer := serveRouter(s.clientRouter(), addr, autocertManager.TLSConfig())
			defer closeClientServer()
		} else {
			closeClientServer := serveRouter(s.clientRouter(), addr, nil)
			defer closeClientServer()
		}

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

func serveRouter(router http.Handler, addr string, tlsConfig *tls.Config) func() {
	// listen
	srv := &http.Server{
		Addr:      addr,
		TLSConfig: tlsConfig,
		// Pass our instance of gorilla/mux in
		Handler: router,
		// Good practice to set timeouts to avoid Slowloris attacks.
		WriteTimeout:      time.Second * 15,
		ReadHeaderTimeout: time.Second * 15,
		IdleTimeout:       time.Second * 60,
	}

	go func() {
		if tlsConfig != nil {
			if err := srv.ListenAndServeTLS("", ""); err != http.ErrServerClosed {
				log.Fatalf("listen and serve (TLS): %s\n", err)
			}
		} else {
			if err := srv.ListenAndServe(); err != http.ErrServerClosed {
				log.Fatalf("listen and serve: %s\n", err)
			}
		}
	}()

	// return shutdown function
	return func() {
		logHTTPString := "HTTP"
		if tlsConfig != nil {
			logHTTPString = "TLS"
		}

		ctx, cancel := context.WithTimeout(context.Background(), time.Second*5)
		defer cancel()

		if err := srv.Shutdown(ctx); err != nil {
			log.Fatalf("%s shutdown: %s\n", logHTTPString, err)
		}
		log.Printf("%s server stopped: %s\n", logHTTPString, addr)
	}
}
