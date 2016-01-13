package main

import (
	"github.com/jinzhu/gorm"
	"gopkg.in/macaron.v1"
)

type Entry struct {
	gorm.Model
	Body string
	Tags []Tag `gorm:"many2many:entry_tags"`
}

type Tag struct {
	gorm.Model
}

func journalInit(m *macaron.Macaron) {
	m.Get("/", func(c *macaron.Context) {
		c.HTML(200, "journal")
	})

	// journalView/<date>
	// journalEntryUpdate/<date>
	//
}
