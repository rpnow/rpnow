//go:generate go run -tags=dev assets_generate.go

package main

import (
	"log"
	"os"
	"os/signal"
)

func main() {
	// Print "Goodbye" after all defer statements are done
	defer log.Println("Goodbye!")

	// load config
	conf := defaultServerConf()
	conf.loadFromINI("/etc/rpnow.ini")
	conf.dataDir = "../data"
	conf.port = 13000

	// run server
	server := &Server{conf: conf}
	stop := server.run()
	defer stop()

	// await kill signal
	c := make(chan os.Signal, 1)
	signal.Notify(c, os.Interrupt)
	<-c
}
