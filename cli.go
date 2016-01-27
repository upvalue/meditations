package main

import (
	"log"
	"os"

	"github.com/codegangsta/cli"
)

func dbcmd(c *cli.Context, create bool) {
	loadConfig(c)
	Config.DBLog = true
	DBOpen()
	DBMigrate()
	if create == true {
		DBCreate()
	}
	DBClose()
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
	}

	app.Commands = []cli.Command{
		{
			Name:  "migrate",
			Usage: "migrate database",
			Flags: flags,
			Action: func(c *cli.Context) {
				dbcmd(c, false)
			},
		},
		{
			Name:   "create",
			Usage:  "create database",
			Flags:  flags,
			Action: func(c *cli.Context) { dbcmd(c, true) },
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
