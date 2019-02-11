package db

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

// Add (bucket, )
// Update
// AddBulk
// Get
// Count
// One
// Has
// Seq

// DB is the badger instance

func init() {
}

func Close() error {
	return DB.Close()
}
