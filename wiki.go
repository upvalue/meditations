package main

import (
	"github.com/jinzhu/gorm"
	"gopkg.in/macaron.v1"
)

type Page struct {
	gorm.Model
	Name      string
	Revisions []Revision `gorm:"many2many:page_revisions;"`
}

type Revision struct {
	gorm.Model
	Number int
	Body   string
}

func wikiInit(m *macaron.Macaron) {
	m.Get("/index", func(c *macaron.Context) {
		var pages []Page
		DB.Find(&pages)
		c.JSON(200, pages)
	})

	m.Get("/", func(c *macaron.Context) {
		c.HTML(200, "wiki")
	})

	m.Post("/new/:name", func(c *macaron.Context) {
		var page Page
		page.Name = c.Params("name")
		DB.FirstOrCreate(&page)
		c.JSON(200, page)
	})
}
