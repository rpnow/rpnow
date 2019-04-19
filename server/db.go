package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"math"

	"github.com/boltdb/bolt"
)

type database struct {
	bolt *bolt.DB
}

func openDB(path string) *database {
	// initialize boltdb
	boltdb, err := bolt.Open(path, 0600, nil)
	if err != nil {
		log.Fatalf("Could not open bolt db at %s\n", path)
	}

	// initialize buckets
	err = boltdb.Update(func(tx *bolt.Tx) (err error) {
		for _, bucketName := range []string{"rooms", "slugs", "msgs", "charas", "system"} {
			_, err = tx.CreateBucketIfNotExists([]byte(bucketName))
			if err != nil {
				return err
			}
		}
		return
	})
	if err != nil {
		log.Fatalln(err)
	}

	// now we can use it
	return &database{boltdb}
}

func (db *database) close() error {
	return db.bolt.Close()
}

type query struct {
	bucket  string
	prefix  string
	skipKey func([]byte) bool
	skip    int
	limit   int
	reverse bool
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

			// decide how to iterate over the db
			var k, v []byte
			var next func() ([]byte, []byte)
			if q.reverse {
				afterPrefix := append(prefix, 0xFF)
				c.Seek(afterPrefix)
				k, v = c.Prev()
				next = func() ([]byte, []byte) { return c.Prev() }
			} else {
				k, v = c.Seek(prefix)
				next = func() ([]byte, []byte) { return c.Next() }
			}
			// iterate
			for ; k != nil && bytes.HasPrefix(k, prefix); k, v = next() {
				if q.skipKey != nil && q.skipKey(k) {
					continue
				}
				if q.skip > 0 {
					q.skip--
					continue
				}
				out, err := parse(v)
				if err != nil {
					return err
				}
				outs <- out
				if q.limit == 1 {
					return nil
				}
				q.limit--
			}
			return nil
		})
		close(outs)
		errs <- err
		close(errs)
	}()

	return
}

func (db *database) countDocs(q query) (count int) {
	outs, errs := db.getDocs(q, func(in []byte) (interface{}, error) {
		return true, nil
	})
	for range outs {
		count++
	}
	if err := <-errs; err != nil {
		log.Fatalln(err)
	}
	return count
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
		log.Fatalln(err)
	}
	return found
}

type kv struct {
	key   string
	value interface{}
}

func (db *database) putDocsOrCrash(bucketName string, pairs []kv) {
	// because the operation of putting documents is idempotent,
	// we can use Batch instead of Update, so many puts can be
	// done concurrently in different goroutines. see bolt docs
	err := db.bolt.Batch(func(tx *bolt.Tx) error {
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
		log.Fatalln(err)
	}
}

func (db *database) putDocOrCrash(bucketName string, key string, value interface{}) {
	db.putDocsOrCrash(bucketName, []kv{{key, value}})
}

func (db *database) getJWTSecret() []byte {
	var out []byte
	db.bolt.View(func(tx *bolt.Tx) error {
		bucket := tx.Bucket([]byte("system"))
		bytes := bucket.Get([]byte("jwtSecret"))
		if bytes == nil {
			return nil
		}
		out = make([]byte, len(bytes))
		copy(out, bytes)
		return nil
	})
	return out
}

func (db *database) putJWTSecret(secret []byte) {
	db.bolt.Update(func(tx *bolt.Tx) error {
		bucket := tx.Bucket([]byte("system"))
		return bucket.Put([]byte("jwtSecret"), secret)
	})
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
		log.Fatalf("RPID not found: %s\n", rpid)
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

func (db *database) putMsg(rpid string, msg *RpMessage) {
	db.putMsgOrChara("msgs", rpid, msg)
}

func (db *database) putChara(rpid string, chara *RpChara) {
	db.putMsgOrChara("charas", rpid, chara)
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
		log.Fatalln(err)
	}
	return revisions
}

func (db *database) queryMsgs(rpid string, q query) []RpMessage {
	msgs := []RpMessage{}
	q.bucket = "msgs"
	q.prefix = rpid
	outs, errs := db.getDocs(q, func(in []byte) (interface{}, error) {
		out := NewRpMessage()
		err := json.Unmarshal(in, &out)
		return out, err
	})
	for out := range outs {
		msgs = append(msgs, out.(RpMessage))
	}
	if err := <-errs; err != nil {
		log.Fatalln(err)
	}
	return msgs
}

func (db *database) getRecentMsgs(rpid string) []RpMessage {
	msgs := db.queryMsgs(rpid, query{
		skipKey: func(key []byte) bool { return !bytes.HasSuffix(key, []byte("/latest")) },
		reverse: true,
		limit:   60,
	})
	for left, right := 0, len(msgs)-1; left < right; left, right = left+1, right-1 {
		msgs[left], msgs[right] = msgs[right], msgs[left]
	}
	return msgs
}

func (db *database) countRoomPages(rpid string) int {
	numMsgs := db.countDocs(query{
		bucket:  "msgs",
		prefix:  rpid,
		skipKey: func(key []byte) bool { return !bytes.HasSuffix(key, []byte("/latest")) },
	})
	return int(math.Ceil(float64(numMsgs) / 20))
}

func (db *database) getPageMsgs(rpid string, pageNum int) []RpMessage {
	return db.queryMsgs(rpid, query{
		skipKey: func(key []byte) bool { return !bytes.HasSuffix(key, []byte("/latest")) },
		skip:    (pageNum - 1) * 20,
		limit:   20,
	})
}

func (db *database) getAllMsgs(rpid string) (chan RpMessage, chan error) {
	msgs := make(chan RpMessage)
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
	go func() {
		for out := range outs {
			msgs <- out.(RpMessage)
		}
		close(msgs)
	}()
	return msgs, errs
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
		log.Fatalln(err)
	}
	return charas
}
