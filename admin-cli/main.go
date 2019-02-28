package main

import (
	"io"
	"net/http"
	"os"
)

func main() {
	res, err := http.Get("http://127.0.0.1:12789/health")
	if err != nil {
		panic(err)
	}
	defer res.Body.Close()
	io.Copy(os.Stdout, res.Body)
}
