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

// type RpDocBody struct {
// 	*RpCharaBody
// 	*RpMessageBody
// }

// func (b RpDocBody) MarshalJSON() ([]byte, error) {
// 	if b.RpMessageBody != nil {
// 		return json.Marshal(b.RpMessageBody)
// 	} else if b.RpCharaBody != nil {
// 		return json.Marshal(b.RpCharaBody)
// 	} else {
// 		return nil, errors.New("RpDocBody MarshalJSON: Empty doc body")
// 	}
// }

type DocBody interface{}

type Doc struct {
	// private info
	Seq        *uint64 `json:"event_id"`
	Namespace  string  `json:"namespace"`
	Collection string  `json:"collection"`
	IP         net.IP  `json:"ip"`
	// public info
	Value     DocBody
	ID        string    `json:"_id"`
	Revision  *int      `json:"revision"`
	Timestamp time.Time `json:"timestamp"`
	Userid    string    `json:"userid"`
}

func (x *Doc) Key() []byte {
	return []byte(x.Namespace + "_" + x.Collection + "_" + x.ID)
}

func (x *Doc) PublicValue() []byte {
	docStr, err := json.Marshal(x.Value)
	if err != nil {
		panic(err)
	}
	var pubMap map[string]interface{}
	json.Unmarshal(docStr, &pubMap)
	pubMap["_id"] = x.ID
	pubMap["revision"] = x.Revision
	pubMap["timestamp"] = x.Timestamp
	pubMap["userid"] = x.Userid
	pubVal, err := json.Marshal(pubMap)
	if err != nil {
		panic(err)
	}
	return pubVal
}

type Filters struct {
	AfterSeq       uint64
	Skip           int
	Limit          int
	Reverse        bool
	IncludeHistory bool
	IncludeMeta    bool
}

func Add(doc *Doc) error {
	key := doc.Key()
	return bdb.Update(func(tx *bolt.Tx) error {
		docs := tx.Bucket([]byte("docs"))

		// set seq
		seq, err := docs.NextSequence()
		doc.Seq = &seq

		// set timestamp if not exists
		if doc.Timestamp.IsZero() {
			doc.Timestamp = time.Now()
		}

		// make sure doc does not exist already
		existingDoc := docs.Get(key)
		if existingDoc != nil {
			return fmt.Errorf("Document %s already exists", string(key))
		}

		// get bytes to store
		valBytes, err := json.Marshal(doc)
		if err != nil {
			return fmt.Errorf("Document add: JSON marshal error: %s", err)
		}
		fmt.Printf("DB ADD %s : %s\n", string(key), valBytes)

		// store doc
		// valueArr := [][]byte{valBytes}
		err = docs.Put(key, valBytes)
		return err
	})
}

func Update(doc *Doc) {

}

// func AddBulk(entries []Entry) {
// }

func Query(prefix []byte, filters Filters) {

}

func Count(prefix []byte) {

}

func One(doc *Doc) error {
	key := doc.Key()
	err := bdb.View(func(tx *bolt.Tx) error {
		docs := tx.Bucket([]byte("docs"))
		valBytes := docs.Get(key)
		if valBytes == nil {
			return fmt.Errorf("No document at %s", string(key))
		}
		err := json.Unmarshal(valBytes, doc)
		return err
	})
	return err
}

func Has(key []byte) {

}

func Seq() {

}
