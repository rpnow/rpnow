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

type kv struct {
	key   string
	value interface{}
}

func (db *database) putDoc(bucketName string, key string, value interface{}) error {
	return db.putDocs(bucketName, []kv{{key, value}})
}

func (db *database) putDocOrCrash(bucketName string, key string, value interface{}) {
	err := db.putDoc(bucketName, key, value)
	if err != nil {
		log.Fatal(err)
	}
}

func (db *database) putDocs(bucketName string, pairs []kv) error {
	return db.bolt.Update(func(tx *bolt.Tx) error {
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
	db.putDocOrCrash("slugs", slug, value)
}

func (db *database) getRoomInfo(rpid string) *RoomInfo {
	var room RoomInfo
	found, err := db.getDoc("rooms", rpid, &room)
	if err != nil {
		log.Fatal(err)
	}
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
	found, err := db.getDoc("msgs", rpid+"/"+id+"/latest", &msg)
	if err != nil {
		log.Fatal(err)
	}
	if !found {
		return nil
	}
	return &msg
}

func (db *database) getChara(rpid string, id string) *RpChara {
	var chara RpChara
	found, err := db.getDoc("charas", rpid+"/"+id+"/latest", &chara)
	if err != nil {
		log.Fatal(err)
	}
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
	outs, errs := db.getDocs(bucket, rpid+"/"+id, func(in []byte) (interface{}, error) {
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
