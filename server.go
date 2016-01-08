package main

import (
	"fmt"
	"net/http"
	"time"

	"github.com/tylerb/graceful"
)

type Configuration struct {
	Port      int
	DBPath    string
	Host      string
	SiteTitle string
}

var Config = Configuration{
	Host:      "",
	Port:      8080,
	DBPath:    "development.sqlite3",
	SiteTitle: "meditations",
}

func Server() *graceful.Server {
	server := &graceful.Server{
		Timeout: 10 * time.Second,
		Server: &http.Server{
			Addr:    fmt.Sprintf("%s:%v", Config.Host, Config.Port),
			Handler: App(),
		},
	}

	return server
}
