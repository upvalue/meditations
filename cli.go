package main

import (
	"os"

	"github.com/codegangsta/cli"
)

func main() {
	app := cli.NewApp()
	app.Name = "meditations"
	app.Action = func(c *cli.Context) {

	}

	app.Run(os.Args)
}
