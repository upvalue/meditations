package main

import (
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/tylerb/graceful"
)

type Configuration struct {
	Port      int
	DBPath    string
	DBLog     bool
	Host      string
	SiteTitle string
	Encrypted bool
}

var Config = Configuration{
	Host:      "",
	Port:      8080,
	DBPath:    "development.sqlite3",
	DBLog:     false,
	SiteTitle: "meditations",
	Encrypted: false,
}

func Server() *graceful.Server {
	server := &graceful.Server{
		Timeout: 10 * time.Second,
		Server: &http.Server{
			Addr:    fmt.Sprintf("%s:%v", Config.Host, Config.Port),
			Handler: App(),
		},
	}

	server.BeforeShutdown = func() {
		log.Printf("closing database")
		DBClose()
		log.Printf("shutting down server")
	}

	return server
}
