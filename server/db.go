package main

import (
	"encoding/json"
	"fmt"
	"log"

	"github.com/boltdb/bolt"
)

var rpsByID map[string]*RP
var revisions map[string][]json.RawMessage

func init() {
	rpsByID = make(map[string]*RP)
	revisions = make(map[string][]json.RawMessage)
}

type database struct {
	bolt *bolt.DB
}

var db *database

// ROOMS: rpid -> json
// MSGS: rpid/xid -> json
// CHARAS: rpid/xid -> json
// SLUGS: slug -> {rpid,access}
// REVISIONS: (msg|chara)id -> []json

func init() {
	// path to boltdb file
	path := "../data/rpnow.boltdb"

	// initialize boltdb
	boltdb, err := bolt.Open(path, 0600, nil)
	if err != nil {
		log.Fatalf("Could not open bolt db at %s", path)
	}

	// initialize buckets
	err = boltdb.Update(func(tx *bolt.Tx) (err error) {
		for _, bucketName := range []string{"rooms", "slugs", "msgs", "charas", "revisions"} {
			_, err = tx.CreateBucketIfNotExists([]byte(bucketName))
			if err != nil {
				return err
			}
		}
		return
	})
	if err != nil {
		log.Fatal(err)
	}

	// now we can use it
	db = &database{boltdb}
}

func (db *database) getSlugInfo(rpid string, out interface{}) error {
	return db.bolt.View(func(tx *bolt.Tx) error {
		bucket := tx.Bucket([]byte("slugs"))
		js := bucket.Get([]byte(rpid))
		if js == nil {
			return fmt.Errorf("Could not find slug @ %s", rpid)
		}
		return json.Unmarshal(js, out)
	})
}

func (db *database) addSlugInfo(rpid string, value interface{}) error {
	return db.bolt.Update(func(tx *bolt.Tx) error {
		bucket := tx.Bucket([]byte("slugs"))
		js, err := json.Marshal(value)
		if err != nil {
			return err
		}
		return bucket.Put([]byte(rpid), js)
	})
}
