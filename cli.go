package main

import (
	"log"
	"os"

	"github.com/BurntSushi/toml"
	"github.com/codegangsta/cli"
)

func main() {
	app := cli.NewApp()
	app.Name = "meditations"

	app.Action = func(c *cli.Context) {
		if len(c.Args()) > 0 {
			config_path := c.Args()[0]
			_, err := toml.DecodeFile(config_path, &Config)
			checkErr(err)
			log.Printf("loaded configuration from %s\n", config_path)
		}

		log.Printf("running with configuration %+v\n", Config)
		log.Printf("starting server")
		server := Server()
		err := server.ListenAndServe()
		log.Printf("%v", err)
	}

	app.Run(os.Args)
}
