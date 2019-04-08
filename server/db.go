package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"

	"github.com/boltdb/bolt"
)

var rpsByID map[string]*RP

func init() {
	rpsByID = make(map[string]*RP)
}

type database struct {
	bolt *bolt.DB
}

var db *database

// ROOMS: rpid -> json
// MSGS: rpid/xid -> json
// CHARAS: rpid/xid -> json
// SLUGS: slug -> {rpid,access}
// REVISIONS: rpid/(msg|chara)id -> []json

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

func (db *database) getDoc(bucketName string, key string, out interface{}) (found bool, err error) {
	err = db.bolt.View(func(tx *bolt.Tx) error {
		bucket := tx.Bucket([]byte(bucketName))
		if bucket == nil {
			found = false
			return fmt.Errorf("Unknown bucket: %s", bucketName)
		}
		js := bucket.Get([]byte(key))
		found = (js != nil)
		if js == nil {
			return nil
		}
		return json.Unmarshal(js, out)
	})
	return
}

func (db *database) getDocs(bucketName string, prefixStr string, parse func([]byte) (interface{}, error)) (outs chan interface{}, errs chan error) {
	outs = make(chan interface{})
	errs = make(chan error)

	go func() {
		err := db.bolt.View(func(tx *bolt.Tx) error {
			bucket := tx.Bucket([]byte(bucketName))
			if bucket == nil {
				return fmt.Errorf("Unknown bucket: %s", bucketName)
			}

			c := bucket.Cursor()
			prefix := []byte(prefixStr)
			for k, v := c.Seek(prefix); k != nil && bytes.HasPrefix(k, prefix); k, v = c.Next() {
				out, err := parse(v)
				if err != nil {
					return err
				}
				outs <- out
			}
			return nil
		})
		close(outs)
		errs <- err
		close(errs)
	}()

	return
}

func (db *database) addDoc(bucketName string, key string, value interface{}) error {
	return db.bolt.Update(func(tx *bolt.Tx) error {
		bucket := tx.Bucket([]byte(bucketName))
		if bucket == nil {
			return fmt.Errorf("Unknown bucket: %s", bucketName)
		}
		js, err := json.Marshal(value)
		if err != nil {
			return err
		}
		return bucket.Put([]byte(key), js)
	})
}

func (db *database) getSlugInfo(slug string) *SlugInfo {
	var slugInfo SlugInfo
	found, err := db.getDoc("slugs", slug, &slugInfo)
	if err != nil {
		log.Fatal(err)
	}
	if !found {
		return nil
	}
	return &slugInfo
}

func (db *database) addSlugInfo(slug string, value *SlugInfo) {
	err := db.addDoc("slugs", slug, value)
	if err != nil {
		log.Fatal(err)
	}
}

func (db *database) addRevision(rpid string, obj Doc) {
	revid := fmt.Sprintf("%s/%s/%d", rpid, obj.Meta().ID, obj.Meta().Revision)
	err := db.addDoc("revisions", revid, obj)
	if err != nil {
		log.Fatal(err)
	}
}

func (db *database) getRevisions(rpid string, id string) []map[string]interface{} {
	revisions := []map[string]interface{}{}
	outs, errs := db.getDocs("revisions", rpid+"/"+id, func(in []byte) (interface{}, error) {
		out := make(map[string]interface{})
		err := json.Unmarshal(in, &out)
		return out, err
	})
	for rev := range outs {
		revisions = append(revisions, rev.(map[string]interface{}))
	}
	if err := <-errs; err != nil {
		log.Fatal(err)
	}
	return revisions
}
