// +build ignore

package main

import (
	"log"

	"github.com/rpnow/rpnow/server/frontend"
	"github.com/shurcooL/vfsgen"
)

func main() {
	err := vfsgen.Generate(frontend.StaticAssets, vfsgen.Options{
		PackageName:  "frontend",
		BuildTags:    "!dev",
		VariableName: "StaticAssets",
		Filename:     "frontend/assets_bundle.go",
	})
	if err != nil {
		log.Fatalln(err)
	}
}
