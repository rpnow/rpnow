package main

import (
	"flag"
	"log"
	"os"
	"os/signal"
)

func main() {
	flag.Parse()
	if flag.Arg(0) == "server" {
		runServer()
	} else {
		runShell()
	}
}

func runServer() {
	// load config
	conf := defaultServerConf()
	conf.loadFromINI("/etc/rpnow.ini")
	conf.loadFromINI("./rpnow.ini")
	conf.loadFromEnv()

	// run server
	server := &Server{conf: conf}
	stop := server.run()
	defer func() {
		stop()
		log.Println("Goodbye!")
	}()

	// await kill signal
	c := make(chan os.Signal, 1)
	signal.Notify(c, os.Interrupt)
	<-c
}
