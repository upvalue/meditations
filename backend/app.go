// Package backend contains the backend code for meditations
package backend

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"path"
	"path/filepath"
	"runtime"
	"strings"
	"time"

	"github.com/go-macaron/pongo2"
	"github.com/jinzhu/gorm"
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
	Demo    bool
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
	Demo:        false,
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
	Config.Demo = c.Bool("demo")
}

/** GetAppPath retrieves the application path.
 * Some care is taken to make this work outside of the go path
 */
func GetAppPath() string {
	ex, err := os.Executable()
	if err != nil {
		panic(err)
	}

	// If this is a built executable
	if strings.HasSuffix(ex, "meditations") == true {
		return filepath.Dir(ex)
	}

	// If this is being run by `go run`
	_, filename, _, ok := runtime.Caller(0)
	if !ok {
		panic("No caller information")
	}

	packagePath := path.Dir(filename)
	// Go up from /backend directory
	packagePath = path.Dir(packagePath)

	return packagePath
}

// App configures returns a meditations web application
func App() *macaron.Macaron {
	packagePath := GetAppPath()

	Config.PackagePath = packagePath
	cwd, err := os.Getwd()

	fmt.Printf("Using %s as path\n", packagePath)

	webpackCheck := path.Join(Config.PackagePath, "assets/webpack/bundle-habits.js")

	_, err = os.Stat(webpackCheck)

	if os.IsNotExist(err) {
		webpackCheck2 := path.Join(cwd, "assets/webpack/bundle-habits.js")
		_, err = os.Stat(webpackCheck2)
		packagePath = cwd
		fmt.Printf("Scratch that, using CWD %s as path\n", cwd)
		if os.IsNotExist(err) {
			panic(fmt.Sprintf("Could not find bundle-habits.js at %s or %s; have you run yarn and webpack?", webpackCheck, webpackCheck2))
		}
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

	fmt.Printf("%s\n", path.Join(packagePath, "templates"))

	m.Use(pongo2.Pongoer(pongo2.Options{
		Directory:  path.Join(packagePath, "templates"),
		Extensions: []string{".htm"},
	}))

	// Serve static files from /assets
	m.Use(macaron.Static(path.Join(packagePath, "assets"), macaron.StaticOptions{Prefix: "assets"}))

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

	// Block robots from indexing the demo page
	m.Get("/robots.txt", func(c *macaron.Context) {
		c.PlainText(200, []byte("User-agent: *\nDisallow: /\n"))
	})

	m.Get("/", func(c *macaron.Context) {
		c.Redirect("/habits")
	})

	init := func(x string, r func(m *macaron.Macaron)) { m.Group(x, func() { r(m) }) }

	init("/habits", habitsInit)
	init("/journal", journalInit)
	graphqlInit(m)

	m.Get("/test", func(c *macaron.Context) {
		c.HTML(200, "test")
	})

	return m
}

// Server returns a server that closes gracefully
func Server() *http.Server {
	return &http.Server{
		Addr:    fmt.Sprintf("%s:%v", Config.Host, Config.Port),
		Handler: App(),
	}
}

// Main is the entry point for meditations; it handles CLI options and starts
func Main() {
	app := cli.NewApp()
	app.Name = "meditations"

	commonflags := []cli.Flag{
		cli.BoolFlag{
			Name:  "db-log",
			Usage: "log SQL queries (note some commands will verbosely log SQL anyway)",
		},
		cli.StringFlag{
			Name:  "database",
			Usage: "database path",
			Value: "development.sqlite3",
		},
	}

	serverflags := append(commonflags, []cli.Flag{
		cli.BoolFlag{
			Name:  "demo",
			Usage: "If true, will reset the database every hour",
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
	}...)

	app.Commands = []cli.Command{
		{
			Name:  "repair",
			Usage: "repair database errors where possible",
			Flags: commonflags,
			Action: func(c *cli.Context) {
				loadConfig(c)
				Config.DBLog = true
				DBOpen()
				DBRepair(true)
			},
		},

		{
			Name:  "electron",
			Usage: "To be invoked from Electron; allows Electron instances to configure DB path and other things before starting the server",
			Flags: commonflags,
			Action: func(c *cli.Context) {

			},
		},

		{
			Name:  "check",
			Usage: "check database for errors",
			Flags: commonflags,
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
			Usage: "WILL ERASE DATABASE! Seed database with example data beginning from July 2017; for tutorial/demo",
			Flags: append(commonflags, cli.StringFlag{
				Name:  "date",
				Usage: "MMMM-YY date to seed from",
			}),
			Action: func(c *cli.Context) {
				loadConfig(c)
				Config.DBLog = true
				DBOpen()

				if Config.Migrate == true {
					DBMigrate()
				}

				DBSeed(c.String("date"))
				DBClose()
			},
		},

		{
			Name:  "migrate",
			Usage: "migrate database",
			Flags: commonflags,
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
			Flags: serverflags,
			Action: func(c *cli.Context) {
				loadConfig(c)

				DBOpen()

				if Config.Demo {
					// ticker := time.NewTicker(time.Second * 10)
					ticker := time.NewTicker(time.Hour)
					today := time.Now()

					DBSeed(today.AddDate(0, 1, 0).Format("2006-01-02"))

					go func() {
						for t := range ticker.C {
							day := time.Now()
							fmt.Printf("Seeding database at %v!\n", t)
							DBSeed(day.Format("2006-01-02"))
						}
					}()

				}

				// DBSeed
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
