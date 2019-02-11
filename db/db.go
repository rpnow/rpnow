package db

import (
	"math"
	"net"
	"time"

	"github.com/dgraph-io/badger"
)

// event_id: separate k/v store, autoincremented key that points to another key
// namespace: part of key
// collection: part of key
// _id: part of key
// revision: not needed; badger keeps old versions of keys
// body: part of value, stored as gob
// timestamp: part of value
// ip: part of value
// userid: part of value

// KEY: evt -> (ns_coll_id)
// KEY: ns_coll_id -> (body, ts, ip, userid)

var bdb *badger.DB
var seq *badger.Sequence

func Open(path string) (err error) {
	// badger options
	opts := badger.DefaultOptions
	opts.Dir = path
	opts.ValueDir = path
	opts.NumVersionsToKeep = math.MaxInt32
	// TODO disable opts.Logger when it becomes available in a future release of Badger

	// open badger db
	bdb, err = badger.Open(opts)
	if err != nil {
		return
	}

	// auto-incrementing sequence
	seq, err = bdb.GetSequence([]byte("seq"), 1)
	if err != nil {
		return
	}

	return
}

func Close() (err error) {
	if err = seq.Release(); err != nil {
		return
	}
	if err = bdb.Close(); err != nil {
		return
	}
	return
}

type Value struct {
	Body      interface{}
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

func Add(key []byte, value interface{}) {

}

func Update(key []byte, value interface{}) {

}

// func AddBulk(entries []Entry) {
// }

func Query(prefix []byte, filters Filters) {

}

func Count(prefix []byte) {

}

func One(key []byte) {

}

func Has(key []byte) {

}

func Seq() {

}
