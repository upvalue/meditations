package backend

// sync.go - Propagate database syncs across multiple open clients

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/gorilla/websocket"
)

type connection struct {
	ws   *websocket.Conn
	send chan []byte
}

func (c *connection) Reader() {
	for {
		_, _, err := c.ws.ReadMessage()
		if err != nil {
			break
		}
	}
	c.ws.Close()
}

func (c *connection) Writer() {
	for message := range c.send {
		err := c.ws.WriteMessage(websocket.TextMessage, message)
		if err != nil {
			log.Println(err)
			break
		}
	}
	c.ws.Close()
}

// SyncPage contains clients connected to a particular page
type SyncPage struct {
	connections map[*connection]bool
	register    chan *connection
	unregister  chan *connection
	broadcast   chan []byte
	upgrader    *websocket.Upgrader
	name        string
}

// SyncMessage is a typed message to the client
type SyncMessage struct {
	Type  string
	Datum interface{}
}

// Handler returns a function that can be mounted to handle HTTP requests
func (page *SyncPage) Handler() func(w http.ResponseWriter, r *http.Request) {
	return func(w http.ResponseWriter, r *http.Request) {
		ws, err := page.upgrader.Upgrade(w, r, nil)
		checkErr(err)
		c := &connection{send: make(chan []byte, 256), ws: ws}
		page.register <- c
		defer func() { page.unregister <- c }()
		go c.Reader()
		c.Writer()
	}
}

// Server is a goroutine that handles websocket connections
func (page *SyncPage) Server() {
	for {
		select {
		case c := <-page.register:
			log.Printf("Sync[%s]: Registered new sync subscriber\n", page.name)
			page.connections[c] = true
		case c := <-page.unregister:
			if _, ok := page.connections[c]; ok {
				log.Printf("Sync[%s]: Removed sync subscriber\n", page.name)
				delete(page.connections, c)
				close(c.send)
			}
		case m := <-page.broadcast:
			for c := range page.connections {
				select {
				case c.send <- m:
					log.Printf("Sync[%s]: sent data\n", page.name)
				default:
					delete(page.connections, c)
					close(c.send)
				}
			}
		}
	}
}

// MakeSyncPage returns a struct that represents a websocket and its connected clients
func MakeSyncPage(name string) *SyncPage {
	page := &SyncPage{
		connections: make(map[*connection]bool),
		register:    make(chan *connection),
		unregister:  make(chan *connection),
		broadcast:   make(chan []byte),
		upgrader:    &websocket.Upgrader{ReadBufferSize: 1024, WriteBufferSize: 1024},
		name:        name,
	}

	go page.Server()

	return page
}

// Sync sends a JSON message to all clients connected to a particular SyncPage
func (page *SyncPage) SendData(data []byte) {
	log.Printf("Sync[%s]: sending data", page.name)
	select {
	case page.broadcast <- data:
	default:
	}
}

func (page *SyncPage) Send(Type string, datum interface{}) {
	json, err := json.Marshal(SyncMessage{Type, datum})
	checkErr(err)
	page.SendData(json)
}
