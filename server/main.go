//go:generate go run -tags=dev assets_generate.go

package main

import (
	"fmt"
	"log"
	"os"
	"os/signal"
	"path"
)

func main() {
	// Print "Goodbye" after all defer statements are done
	defer log.Println("Goodbye!")

	// load config
	settings := defaultServerSettings()
	settings.loadFromINI("/etc/rpnow.ini")
	settings.dataDir = "../data"
	settings.port = 13000

	// db setup
	db.open(path.Join(settings.dataDir, "rpnow.boltdb"))
	defer func() {
		if err := db.close(); err != nil {
			log.Fatalf("Error: db.close: %s\n", err)
		}
		log.Println("Database closed")
	}()

	// get jwt secret
	jwtSecret = getJWTSecret()

	// listen
	addr := fmt.Sprintf(":%d", settings.port)
	closeAdminServer := serveRouter(adminRouter(), adminAddr)
	defer closeAdminServer()
	closeClientServer := serveRouter(clientRouter(), addr)
	defer closeClientServer()

	// server is ready
	log.Printf("Listening on %s\n", addr)

	// await kill signal
	c := make(chan os.Signal, 1)
	signal.Notify(c, os.Interrupt)
	<-c
}
