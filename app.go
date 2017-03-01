package main

import (
	"log"
	"os"

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
	Config.Webpack = c.Bool("webpack")
}

func App() *macaron.Macaron {
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
	m.Use(session.Sessioner())
	m.Use(csrf.Csrfer())
	m.Use(pongo2.Pongoer(pongo2.Options{
		Directory:  "templates",
		Extensions: []string{".htm"},
	}))

	// Serve static files from /assets
	m.Use(macaron.Static("assets", macaron.StaticOptions{Prefix: "assets"}))

	// Expose some configuration variables to templates
	m.Use(func(c *macaron.Context) {
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
		cli.BoolFlag{
			Name:  "webpack",
			Usage: "use webpack-bundled files (run webpack first)",
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
