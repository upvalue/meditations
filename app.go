package main

import (
	"github.com/go-macaron/csrf"
	"github.com/go-macaron/pongo2"
	"github.com/go-macaron/session"
	"gopkg.in/macaron.v1"
)

func App() *macaron.Macaron {
	m := macaron.Classic()

	m.Use(session.Sessioner())
	m.Use(csrf.Csrfer())
	m.Use(pongo2.Pongoer(pongo2.Options{
		Directory:  "templates",
		Extensions: []string{".htm"},
	}))

	// Serve static files from /assets
	m.Use(macaron.Static("assets", macaron.StaticOptions{Prefix: "assets"}))

	m.Use(func(c *macaron.Context) {
		c.Data["SiteTitle"] = Config.SiteTitle
		c.Next()
	})

	m.Get("/", func(c *macaron.Context) {
		//c.PlainText(200, []byte("Hello"))
		c.HTML(200, "index")
	})

	return m
}
