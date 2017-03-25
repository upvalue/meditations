package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/codegangsta/cli"
	"github.com/go-macaron/pongo2"
	"github.com/tylerb/graceful"
	"gopkg.in/macaron.v1"
)

type Configuration struct {
	Port        int
	DBPath      string
	DBLog       bool
	Host        string
	SiteTitle   string
	Development bool
	Tutorial    bool
	Migrate     bool
	Message     string
	Webpack     bool
}

var Config = Configuration{
	Host:        "",
	Port:        8080,
	DBPath:      "development.sqlite3",
	DBLog:       false,
	SiteTitle:   "meditations",
	Development: true,
	Tutorial:    false,
	Migrate:     false,
	Message:     "",
	Webpack:     false,
}

func loadConfig(c *cli.Context) {
	Config.DBLog = c.Bool("db-log")
	Config.Development = c.BoolT("development")
	Config.DBPath = c.String("database")
	Config.Port = c.Int("port")
	Config.Tutorial = c.Bool("tutorial")
	Config.Migrate = c.Bool("migrate")
	Config.Message = c.String("message")
}

func App() *macaron.Macaron {
	_, err := os.Stat("./assets/webpack-bundle-habits.js")
	Config.Webpack = !os.IsNotExist(err)

	m := macaron.Classic()

	DBOpen()
	if Config.Migrate == true {
		DBMigrate()
	}

	if Config.Tutorial == true {
		DBLoadTutorial()
	}

	if Config.Development == true {
		macaron.Env = "development"
	} else {
		macaron.Env = "production"
	}

	m.Use(pongo2.Pongoer(pongo2.Options{
		Directory:  "templates",
		Extensions: []string{".htm"},
	}))

	// Serve static files from /assets
	m.Use(macaron.Static("assets", macaron.StaticOptions{Prefix: "assets"}))

	// If not using webpack, load assets from node_modules directory
	if !Config.Webpack {
		m.Use(macaron.Static("node_modules", macaron.StaticOptions{Prefix: "node_modules"}))
	}

	// Expose configuration variables to templates & javascript
	cfg_json_, err := json.Marshal(Config)
	cfg_json := fmt.Sprintf("%s", cfg_json_)
	if err != nil {
		panic(err)
	}

	m.Use(func(c *macaron.Context) {
		c.Data["ConfigJSON"] = cfg_json
		c.Data["Config"] = Config
		c.Next()
	})

	// Routes
	m.Get("/favicon.ico", func(c *macaron.Context) {
		c.ServeFileContent("favicon.ico")
	})

	m.Get("/", func(c *macaron.Context) {
		c.Redirect("/habits")
	})

	init := func(x string, r func(m *macaron.Macaron)) { m.Group(x, func() { r(m) }) }

	init("/habits", habitsInit)
	init("/journal", journalInit)

	return m
}

func Server() *graceful.Server {
	server := &graceful.Server{
		Timeout: 10 * time.Second,
		Server: &http.Server{
			Addr:    fmt.Sprintf("%s:%v", Config.Host, Config.Port),
			Handler: App(),
		},
	}

	server.BeforeShutdown = func() bool {
		log.Printf("closing database")
		DBClose()
		log.Printf("shutting down server")
		return true
	}

	return server
}

func main() {
	app := cli.NewApp()
	app.Name = "meditations"

	flags := []cli.Flag{
		cli.BoolFlag{
			Name:  "db-log",
			Usage: "verbosely log SQL",
		},
		cli.StringFlag{
			Name:  "database",
			Usage: "database",
			Value: "development.sqlite3",
		},
		cli.StringFlag{
			Name:  "message",
			Usage: "A message that will be displayed at the top, used for demo deployment",
		},
		cli.BoolTFlag{
			Name:  "development",
			Usage: "whether development is true",
		},
		cli.BoolFlag{
			Name:  "tutorial",
			Usage: "enable tutorial",
		},
		cli.IntFlag{
			Name:  "port",
			Usage: "HTTP port",
			Value: 8080,
		},
		cli.BoolFlag{
			Name:  "migrate",
			Usage: "run database migration",
		},
	}

	app.Commands = []cli.Command{
		{
			Name:   "repair",
			Usage:  "repair out-of-order tasks in database",
			Flags:  flags,
			Action: func(c *cli.Context) { DBRepair() },
		},
		{
			Name:  "migrate",
			Usage: "migrate database",
			Flags: flags,
			Action: func(c *cli.Context) {
				loadConfig(c)
				Config.DBLog = true
				fmt.Printf("%v\n", Config)
				DBOpen()
				DBMigrate()
				DBClose()
			},
		},
		{
			Name:  "serve",
			Usage: "start server",
			Flags: flags,
			Action: func(c *cli.Context) {
				loadConfig(c)
				log.Printf("running with configuration %+v\n", Config)
				log.Printf("starting server")
				server := Server()
				err := server.ListenAndServe()
				log.Printf("%v", err)
			},
		},
	}

	app.Run(os.Args)
}
