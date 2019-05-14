//go:generate go run -tags=dev assets_generate.go

package main

import (
	"flag"
	"log"
	"os"
	"os/signal"
)

func main() {
	configPath := flag.String("config", "/etc/rpnow.ini", "path to the server config file")
	flag.Parse()
	if flag.Arg(0) == "server" {
		runServer(*configPath)
	} else {
		runShell()
	}
}

func runServer(configPath string) {
	// get path to config file from cmd args

	// load config
	conf := defaultServerConf()
	conf.loadFromINI(configPath)
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
