package main

import (
	"github.com/go-macaron/binding"
	"github.com/jinzhu/gorm"
	"gopkg.in/macaron.v1"
)

type Page struct {
	gorm.Model
	Name string `json:"name"`
	// NOTE: For some reason, Text Text does not work to create a one-to-many relationship in GORM
	// TODO: Index
	TextID   uint
	FartHell Text
}

type editMessage struct {
	ID           uint
	LastRevision uint
	Body         string
}

type pageMessage struct {
	Page     Page
	Revision Revision
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

	m.Get("/page/*", func(c *macaron.Context) {
		var page Page
		var text Text
		page.Name = c.Params("*")
		if DB.First(&page).RecordNotFound() == false {
			DB.Where("id = ?", page.TextID).First(&text)
			var rev Revision
			rev.TextID = text.ID
			DB.Order("number desc").First(&rev)
			c.JSON(200, pageMessage{
				Page:     page,
				Revision: rev,
			})
		} else {
			c.Error(404, "Page does not exist")
		}
	})

	m.Post("/edit", binding.Bind(editMessage{}), func(c *macaron.Context, e editMessage) {
		var page Page
		var text Text
		page.ID = e.ID
		if DB.First(&page).RecordNotFound() == false {
			DB.Where("id = ?", page.TextID).First(&text)
			var rev Revision
			rev.TextID = text.ID
			rev.Number = e.LastRevision + 1
			rev.Body = e.Body
			err := DB.Create(&rev).Error
			if err != nil {
				c.Error(500, "Could not create revision")
			} else {
				c.JSON(200, pageMessage{
					Page:     page,
					Revision: rev,
				})
			}
		} else {
			c.Error(404, "Page does not exist")
		}
	})

	m.Post("/new/*", func(c *macaron.Context) {
		var page Page
		var text Text
		page.Name = c.Params("*")
		DB.Create(&text)
		page.TextID = text.ID
		//page.Text = text
		DB.Create(&page)
		var rev Revision
		rev.TextID = text.ID
		rev.Number = 1
		rev.Body = "Click to edit"
		DB.Create(&rev)
		c.JSON(200, page)
	})
}
