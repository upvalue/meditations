package main

import macaron "gopkg.in/macaron.v1"

func logInit(m *macaron.Macaron) {
	m.Get("/", func(c *macaron.Context) {
		c.PlainText(200, []byte("HORSE MESS"))
	})
}
