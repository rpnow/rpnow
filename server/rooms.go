package main

import (
	"time"

	"github.com/gorilla/websocket"
)

const (
	// Time allowed to write a message to the peer.
	writeWait = 10 * time.Second

	// Time allowed to read the next pong message from the peer.
	pongWait = 5 * time.Second

	// Send pings to peer with this period. Must be less than pongWait.
	pingPeriod = (pongWait * 9) / 10

	// Maximum message size allowed from peer.
	maxMessageSize = 512
)

var rooms map[string]*room

func init() {
	rooms = make(map[string]*room)
}

type room struct {
	clients map[*client]bool

	broadcast chan chatStreamMessage

	register chan *client

	unregister chan *client
}

type client struct {
	conn *websocket.Conn
	send chan chatStreamMessage
}

func newRoom() *room {
	r := &room{
		broadcast:  make(chan chatStreamMessage),
		register:   make(chan *client),
		unregister: make(chan *client),
		clients:    make(map[*client]bool),
	}
	go r.runRoom()
	return r
}

func newClient(conn *websocket.Conn) *client {
	return &client{
		conn: conn,
		send: make(chan chatStreamMessage),
	}
}

func (r *room) runRoom() {
	for {
		select {
		case client := <-r.register:
			r.clients[client] = true
		case client := <-r.unregister:
			if _, ok := r.clients[client]; ok {
				delete(r.clients, client)
				close(client.send)
			}
		case message := <-r.broadcast:
			for client := range r.clients {
				select {
				case client.send <- message:
				default:
					delete(r.clients, client)
					close(client.send)
				}
			}
		}
	}
}

func join(conn *websocket.Conn, rpid string, firstPacket chatStreamMessage) {
	// create room object
	if rooms[rpid] == nil {
		rooms[rpid] = newRoom()
	}
	// initialize client
	client := newClient(conn)
	rooms[rpid].register <- client

	// handle pong from client
	client.handlePongs()

	// deliver init messge
	go func() {
		client.send <- firstPacket
	}()

	// write messages to client
	client.writePump()

	// if we can't write to this client anymore (due to disconnecting), unregister
	rooms[rpid].unregister <- client
}

func (c *client) handlePongs() {
	c.conn.SetReadLimit(maxMessageSize)
	c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})
}

func (c *client) writePump() {
	ticker := time.NewTicker(pingPeriod)
	defer ticker.Stop()

	for {
		select {
		case message, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))

			if !ok {
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			if err := c.conn.WriteJSON(message); err != nil {
				return
			}
		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))

			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}
