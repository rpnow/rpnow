// +build ignore

package main

import (
	"log"

	"github.com/shurcooL/vfsgen"

	target "github.com/rpnow/rpnow/server"
)

func main() {
	err := vfsgen.Generate(target.StaticAssets, vfsgen.Options{
		PackageName:  "main",
		BuildTags:    "!dev",
		VariableName: "StaticAssets",
		Filename:     "assets_bundle.go",
	})
	if err != nil {
		log.Fatalln(err)
	}
}
