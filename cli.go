package main

import (
	"log"
	"os"

	"github.com/codegangsta/cli"
)

func main() {
	app := cli.NewApp()
	app.Name = "meditations"

	flags := []cli.Flag{
		cli.BoolFlag{
			Name:  "db-log",
			Usage: "verbosely log SQL",
		},
		cli.BoolTFlag{
			Name:  "development",
			Usage: "whether development is true",
		},
	}

	app.Commands = []cli.Command{
		{
			Name:  "migrate",
			Usage: "database migrations",
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
