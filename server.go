package main

import (
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/tylerb/graceful"
)

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
