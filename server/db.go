package main

import (
	"encoding/json"
	"log"

	"github.com/boltdb/bolt"
)

var rpsByID map[string]*RP
var slugMap map[string]SlugInfo
var revisions map[string][]json.RawMessage

func init() {
	rpsByID = make(map[string]*RP)
	slugMap = make(map[string]SlugInfo)
	revisions = make(map[string][]json.RawMessage)
}

var db struct {
	bdb *bolt.DB
}

func init() {
	path := "../data/rpnow.boltdb"

	bdb, err := bolt.Open(path, 0600, nil)
	if err != nil {
		log.Fatalf("Could not open bolt db at %s", path)
	}
	db.bdb = bdb
}
