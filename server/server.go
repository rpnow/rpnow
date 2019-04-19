package main

import (
	"context"
	"crypto/rand"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/gorilla/mux"
	"github.com/zieckey/goini"
)

var adminPort = 12789
var adminAddr = fmt.Sprintf("127.0.0.1:%d", adminPort)

var jwtSecret []byte

type serverSettings struct {
	dataDir              string
	port                 int
	ssl                  bool
	sslPort              int
	sslDomain            string
	letsencryptAcceptTOS bool
	letsencryptEmail     string
}

func defaultServerSettings() *serverSettings {
	return &serverSettings{
		dataDir: "/var/local/rpnow",
		port:    80,
		ssl:     false,
		sslPort: 443,
	}
}

func (s *serverSettings) loadFromINI(filename string) {
	ini := goini.New()
	if err := ini.ParseFile(filename); err != nil {
		log.Fatalf("parse INI file %v failed : %v\n", filename, err.Error())
	}

	if dataDir, ok := ini.Get("dataDir"); ok {
		s.dataDir = dataDir
	}

	if port, ok := ini.GetInt("port"); ok {
		s.port = port
	}

	if ssl, ok := ini.GetBool("ssl"); ok {
		s.ssl = ssl
	}

	if sslPort, ok := ini.GetInt("sslPort"); ok {
		s.sslPort = sslPort
	}

	if sslDomain, ok := ini.Get("sslDomain"); ok {
		s.sslDomain = sslDomain
	}

	if letsencryptAcceptTOS, ok := ini.GetBool("letsencryptAcceptTOS"); ok {
		s.letsencryptAcceptTOS = letsencryptAcceptTOS
	}

	if letsencryptEmail, ok := ini.Get("letsencryptEmail"); ok {
		s.letsencryptEmail = letsencryptEmail
	}
}

func getJWTSecret() []byte {
	if secret := db.getJWTSecret(); secret != nil {
		return secret
	}
	secret := make([]byte, 256/8)
	if _, err := rand.Read(secret); err != nil {
		log.Fatalf("Failed to generate JWT secret")
	}
	db.putJWTSecret(secret)
	return secret
}

func serveRouter(router *mux.Router, addr string) func() {
	// listen
	srv := &http.Server{
		Addr: addr,
		// Good practice to set timeouts to avoid Slowloris attacks.
		WriteTimeout: time.Second * 15,
		ReadTimeout:  time.Second * 15,
		IdleTimeout:  time.Second * 60,
		Handler:      router, // Pass our instance of gorilla/mux in.
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
