package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"

	"github.com/boltdb/bolt"
)

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
	db = &database{}
}

func (db *database) open() {
	// path to boltdb file
	path := "../data/rpnow.boltdb"

	// initialize boltdb
	boltdb, err := bolt.Open(path, 0600, nil)
	if err != nil {
		log.Fatalf("Could not open bolt db at %s", path)
	}

	// initialize buckets
	err = boltdb.Update(func(tx *bolt.Tx) (err error) {
		for _, bucketName := range []string{"rooms", "slugs", "msgs", "charas"} {
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
	db.bolt = boltdb
}

func (db *database) close() error {
	return db.bolt.Close()
}

type query struct {
	bucket  string
	prefix  string
	skipKey func([]byte) bool
}

func (db *database) getDocs(q query, parse func([]byte) (interface{}, error)) (outs chan interface{}, errs chan error) {
	outs = make(chan interface{})
	errs = make(chan error)

	go func() {
		err := db.bolt.View(func(tx *bolt.Tx) error {
			bucket := tx.Bucket([]byte(q.bucket))
			if bucket == nil {
				return fmt.Errorf("Unknown bucket: %s", q.bucket)
			}

			c := bucket.Cursor()
			prefix := []byte(q.prefix)
			for k, v := c.Seek(prefix); k != nil && bytes.HasPrefix(k, prefix); k, v = c.Next() {
				if q.skipKey != nil && q.skipKey(k) {
					continue
				}
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

func (db *database) getDoc(bucketName string, key string, out interface{}) bool {
	found := false
	err := db.bolt.View(func(tx *bolt.Tx) error {
		bucket := tx.Bucket([]byte(bucketName))
		if bucket == nil {
			return fmt.Errorf("Unknown bucket: %s", bucketName)
		}
		js := bucket.Get([]byte(key))
		if js == nil {
			return nil
		}
		found = true
		return json.Unmarshal(js, out)
	})
	if err != nil {
		log.Fatal(err)
	}
	return found
}

type kv struct {
	key   string
	value interface{}
}

func (db *database) putDocsOrCrash(bucketName string, pairs []kv) {
	err := db.bolt.Update(func(tx *bolt.Tx) error {
		bucket := tx.Bucket([]byte(bucketName))
		if bucket == nil {
			return fmt.Errorf("Unknown bucket: %s", bucketName)
		}
		for _, kv := range pairs {
			js, err := json.Marshal(kv.value)
			if err != nil {
				return err
			}
			err = bucket.Put([]byte(kv.key), js)
			if err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		log.Fatal(err)
	}
}

func (db *database) putDocOrCrash(bucketName string, key string, value interface{}) {
	db.putDocsOrCrash(bucketName, []kv{{key, value}})
}

func (db *database) getSlugInfo(slug string) *SlugInfo {
	var slugInfo SlugInfo
	found := db.getDoc("slugs", slug, &slugInfo)
	if !found {
		return nil
	}
	return &slugInfo
}

func (db *database) addSlugInfo(slug string, value *SlugInfo) {
	db.putDocOrCrash("slugs", slug, value)
}

func (db *database) getRoomInfo(rpid string) *RoomInfo {
	var room RoomInfo
	found := db.getDoc("rooms", rpid, &room)
	if !found {
		log.Fatalf("RPID not found: %s", rpid)
	}
	return &room
}

func (db *database) addRoomInfo(rpid string, room *RoomInfo) {
	db.putDocOrCrash("rooms", rpid, room)
}

func (db *database) getMsg(rpid string, id string) *RpMessage {
	var msg RpMessage
	found := db.getDoc("msgs", rpid+"/"+id+"/latest", &msg)
	if !found {
		return nil
	}
	return &msg
}

func (db *database) getChara(rpid string, id string) *RpChara {
	var chara RpChara
	found := db.getDoc("charas", rpid+"/"+id+"/latest", &chara)
	if !found {
		return nil
	}
	return &chara
}

func (db *database) putMsgOrChara(bucket string, rpid string, obj Doc) {
	key := fmt.Sprintf("%s/%s/latest", rpid, obj.Meta().ID)
	db.putDocOrCrash(bucket, key, obj)
}

func (db *database) putMsgOrCharaRevision(bucket string, rpid string, obj Doc) {
	key := fmt.Sprintf("%s/%s/%d", rpid, obj.Meta().ID, obj.Meta().Revision)
	db.putDocOrCrash(bucket, key, obj)
}

func (db *database) getMsgOrCharaRevisions(bucket string, rpid string, id string) []map[string]interface{} {
	revisions := []map[string]interface{}{}
	q := query{
		bucket: bucket,
		prefix: rpid + "/" + id,
	}
	outs, errs := db.getDocs(q, func(in []byte) (interface{}, error) {
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

func (db *database) getRecentMsgs(rpid string) []RpMessage {
	msgs := []RpMessage{}
	q := query{
		bucket:  "msgs",
		prefix:  rpid,
		skipKey: func(key []byte) bool { return !bytes.HasSuffix(key, []byte("/latest")) },
	}
	outs, errs := db.getDocs(q, func(in []byte) (interface{}, error) {
		out := NewRpMessage()
		err := json.Unmarshal(in, &out)
		return out, err
	})
	for out := range outs {
		msgs = append(msgs, out.(RpMessage))
	}
	if err := <-errs; err != nil {
		log.Fatal(err)
	}
	return msgs
}

func (db *database) getCharas(rpid string) []RpChara {
	charas := []RpChara{}
	q := query{
		bucket:  "charas",
		prefix:  rpid,
		skipKey: func(key []byte) bool { return !bytes.HasSuffix(key, []byte("/latest")) },
	}
	outs, errs := db.getDocs(q, func(in []byte) (interface{}, error) {
		out := NewRpChara()
		err := json.Unmarshal(in, &out)
		return out, err
	})
	for out := range outs {
		charas = append(charas, out.(RpChara))
	}
	if err := <-errs; err != nil {
		log.Fatal(err)
	}
	return charas
}
