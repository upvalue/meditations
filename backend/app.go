// Package backend contains the backend code for meditations
package backend

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"path"
	"runtime"
	"time"

	"github.com/go-macaron/pongo2"
	"github.com/jinzhu/gorm"
	"github.com/tylerb/graceful"
	"github.com/urfave/cli"
	"gopkg.in/macaron.v1"
)

// Configuration variables, initialized from command line arguments
type Configuration struct {
	// HTTP host
	Host string
	// HTTP port
	Port int
	// Database path
	DBPath string
	// If true, all SQL queries will be logged
	DBLog bool
	// Site title
	SiteTitle string
	// True if running in development mode
	Development bool
	// If true, run a database migration before starting
	Migrate bool
	// Message to be displayed in navbar, used in the demo instance
	Message string
	// Package path
	PackagePath string
}

// Settings represents app settings saved in the database
type Settings struct {
	gorm.Model
	Name string `gorm:"unique"`
	// Schema version; for certain manually-handled migrations
	Schema int
}

// Config is the global application configuration
var Config = Configuration{
	Host:        "",
	Port:        8080,
	DBPath:      "development.sqlite3",
	DBLog:       false,
	SiteTitle:   "meditations",
	Development: true,
	Migrate:     false,
	Message:     "",
	PackagePath: "",
}

func loadConfig(c *cli.Context) {
	Config.DBLog = c.Bool("db-log")
	Config.Development = c.BoolT("development")
	Config.DBPath = c.String("database")
	Config.Port = c.Int("port")
	Config.Migrate = c.Bool("migrate")
	Config.Message = c.String("message")
}

// App configures returns a meditations web application
func App() *macaron.Macaron {
	_, filename, _, ok := runtime.Caller(0)
	if !ok {
		panic("No caller information")
	}

	packagePath := path.Dir(filename)
	// Go up from /backend directory
	packagePath = path.Dir(packagePath)

	Config.PackagePath = packagePath

	fmt.Printf("Using %s as path\n", packagePath)

	webpackCheck := path.Join(Config.PackagePath, "assets/webpack/bundle-habits.js")

	_, err := os.Stat(webpackCheck)

	if os.IsNotExist(err) {
		panic(fmt.Sprintf("%s not found; have you run yarn and webpack?", webpackCheck))
	}

	m := macaron.Classic()

	DBOpen()
	if Config.Migrate == true {
		DBMigrate()
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

	// Expose configuration variables to templates & javascript
	cfgjsonc, err := json.Marshal(Config)
	cfgjson := fmt.Sprintf("%s", cfgjsonc)
	if err != nil {
		panic(err)
	}

	m.Use(func(c *macaron.Context) {
		c.Data["ConfigJSON"] = cfgjson
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

	m.Get("/test", func(c *macaron.Context) {
		c.HTML(200, "test")
	})

	return m
}

// Server returns a server that closes gracefully
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

// Main is the entry point for meditations; it handles CLI options and starts
func Main() {
	app := cli.NewApp()
	app.Name = "meditations"

	flags := []cli.Flag{
		cli.BoolFlag{
			Name:  "db-log",
			Usage: "log SQL queries",
		},
		cli.StringFlag{
			Name:  "database",
			Usage: "database path",
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
		cli.IntFlag{
			Name:  "port",
			Usage: "HTTP port",
			Value: 8080,
		},
		cli.BoolFlag{
			Name:  "migrate",
			Usage: "run database migration before performing action",
		},
	}

	app.Commands = []cli.Command{
		{
			Name:  "repair",
			Usage: "repair database errors where possible",
			Flags: flags,
			Action: func(c *cli.Context) {
				loadConfig(c)
				Config.DBLog = true
				DBOpen()
				DBRepair(true)
			},
		},

		{
			Name:  "check",
			Usage: "check database for errors",
			Flags: flags,
			Action: func(c *cli.Context) {
				loadConfig(c)
				Config.DBLog = true
				DBOpen()
				DBRepair(false)
				DBClose()
			},
		},

		{
			Name:  "seed",
			Usage: "Seed database with example data beginning from July 2017; for tutorial/demo, will add lots of info to database!",
			Flags: flags,
			Action: func(c *cli.Context) {
				loadConfig(c)
				Config.DBLog = true
				DBOpen()
				if Config.Migrate == true {
					DBMigrate()
				}
				DBSeed("2017-07")
				DBClose()
			},
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
