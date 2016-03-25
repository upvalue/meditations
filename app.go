package main

import (
	"fmt"
	"log"

	"github.com/BurntSushi/toml"
	"github.com/codegangsta/cli"
	"github.com/go-macaron/csrf"
	"github.com/go-macaron/pongo2"
	"github.com/go-macaron/session"
	"gopkg.in/macaron.v1"
)

type Configuration struct {
	Port        int
	DBPath      string
	DBLog       bool
	Host        string
	SiteTitle   string
	Encrypted   bool
	Development bool
}

var Config = Configuration{
	Host:        "",
	Port:        8080,
	DBPath:      "development.sqlite3",
	DBLog:       false,
	SiteTitle:   "meditations",
	Encrypted:   false,
	Development: true,
}

func loadConfig(c *cli.Context) {
	if len(c.Args()) > 0 {
		config_path := c.Args()[0]
		_, err := toml.DecodeFile(config_path, &Config)
		checkErr(err)
		log.Printf("loaded configuration from %s %+v\n", config_path, Config)
	}

	if c.IsSet("db-log") == true {
		Config.DBLog = c.Bool("db-log")
	}

	if c.IsSet("development") == true {
		Config.Development = c.BoolT("development")
	}

	if c.IsSet("database") == true {
		Config.DBPath = c.String("database")
	}

	if c.IsSet("port") == true {
		Config.Port = c.Int("port")
	}
}

func App() *macaron.Macaron {
	m := macaron.Classic()

	DBOpen()

	if Config.Development == true {
		macaron.Env = "development"
	} else {
		macaron.Env = "production"
	}
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
		c.Data["Development"] = Config.Development
		c.Next()
	})

	// Routes
	m.Get("/favicon.ico", func(c *macaron.Context) {
		c.ServeFileContent("favicon.ico")
	})

	m.Get("/", func(c *macaron.Context) {
		c.Redirect("/habits")
	})

	m.Group("/habits", func() {
		habitsInit(m)
	})

	m.Group("/journal", func() {
		journalInit(m)
	})
	m.Get("/wiki/:name", func(c *macaron.Context) {
		c.Redirect(fmt.Sprintf("/journal#wiki/%s", c.Params("name")), 302)
	})

	return m
}
