package db

import (
	"encoding/json"
	"fmt"
	"net"
	"time"

	"github.com/boltdb/bolt"
)

// event_id: separate bucket, autoincremented key. event_id=>bucket/key/revision#
// namespace: part of key
// collection: part of key
// _id: part of key
// revision: document revisions are kept under a key in an array, earliest revisions stored first
// body: part of value
// timestamp: part of value
// ip: part of value
// userid: part of value

// KEY: evt -> (bucket/key/revision#)
// KEY: ns_coll_id -> (body, ts, ip, userid)

var bdb *bolt.DB

func Open(path string) (err error) {
	bdb, err = bolt.Open(path, 0600, nil)
	if err != nil {
		return
	}
	err = bdb.Update(func(tx *bolt.Tx) (err error) {
		_, err = tx.CreateBucketIfNotExists([]byte("docs"))
		if err != nil {
			return err
		}
		_, err = tx.CreateBucketIfNotExists([]byte("seq"))
		if err != nil {
			return err
		}
		return
	})
	if err != nil {
		return
	}
	return
}

func Close() error {
	return bdb.Close()
}

type Value struct {
	Userid    string    `json:"_userid"`
	IP        net.IP    `json:"_ip"`
	Timestamp time.Time `json:"_timestamp"`
}

type Entry struct {
	Key   []byte
	Value Value
}

type Filters struct {
	AfterSeq       uint64
	Skip           int
	Limit          int
	Reverse        bool
	IncludeHistory bool
	IncludeMeta    bool
}

func Add(keyStr string, valObj interface{}) error {
	key := []byte(keyStr)
	valBytes, err := json.Marshal(valObj)
	if err != nil {
		return err
	}
	fmt.Printf("DB ADD %s : %s\n", keyStr, valBytes)
	return bdb.Update(func(tx *bolt.Tx) error {
		docs := tx.Bucket([]byte("docs"))
		existingDoc := docs.Get(key)
		if existingDoc != nil {
			return fmt.Errorf("Document %s already exists", key)
		}
		// valueArr := [][]byte{valBytes}
		err := docs.Put(key, valBytes)
		return err
	})
}

func Update(key []byte, value interface{}) {

}

// func AddBulk(entries []Entry) {
// }

func Query(prefix []byte, filters Filters) {

}

func Count(prefix []byte) {

}

func One(keyStr string, dst interface{}) error {
	key := []byte(keyStr)
	err := bdb.View(func(tx *bolt.Tx) error {
		docs := tx.Bucket([]byte("docs"))
		valBytes := docs.Get(key)
		if valBytes == nil {
			return fmt.Errorf("No document at %s", keyStr)
		}
		err := json.Unmarshal(valBytes, dst)
		return err
	})
	return err
}

func Has(key []byte) {

}

func Seq() {

}
