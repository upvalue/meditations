package main

import (
	"time"

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
	Name string
}

var journalSync *SyncPage

func journalEntries(c *macaron.Context) {
	date, err := time.Parse("2006-01", c.Query("date"))
	if err != nil {
		serverError(c, "error parsing date %s", c.Query("date"))
	}
	var entry Entry
	from, to := between(date, ScopeMonth)
	DB.Where("created_at between ? and ?", from, to).Find(&entry)
	c.JSON(200, entry)
}

func journalInit(m *macaron.Macaron) {
	m.Get("/", func(c *macaron.Context) {
		c.HTML(200, "journal")
	})

	m.Get("/entries", journalEntries)

	//journalSync = MakeSyncPage("journal")
	//m.Get("/sync", journalSync.Handler())
}
