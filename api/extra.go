package api

import "net/http"

func IndexHTML(w http.ResponseWriter, r *http.Request) {
	http.ServeFile(w, r, "views/dist/index.html")

}
