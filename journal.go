package main

import (
	"time"

	"github.com/go-macaron/binding"
	"github.com/jinzhu/gorm"
	"gopkg.in/macaron.v1"
)

type Entry struct {
	gorm.Model
	Date time.Time
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
		return
	}
	var entries []Entry
	from, to := between(date, ScopeMonth)
	DB.Where("date between ? and ?", from, to).Order("`date` desc").Find(&entries)
	c.JSON(200, entries)
}

func journalEntryNew(c *macaron.Context) {
	date, err := time.Parse("2006-01-02", c.Query("date"))
	if err != nil {
		serverError(c, "error parsing date %s", c.Query("date"))
		return
	}

	var entry Entry
	DB.Where("date = ?", date).Find(&entry)

	if entry.ID > 0 {
		c.JSON(200, entry)
	}

	entry.Date = date
	entry.Body = "Click to edit"
	DB.Save(&entry)
	c.JSON(200, entry)
}

func journalEntryUpdate(c *macaron.Context, entry_update Entry) {
	var entry Entry
	DB.Where("id = ?", entry_update.ID).Find(&entry)
	entry.Body = entry_update.Body
	DB.Save(&entry)

}

func journalInit(m *macaron.Macaron) {
	m.Get("/", func(c *macaron.Context) {
		c.HTML(200, "journal")
	})

	m.Get("/entries", journalEntries)
	m.Post("/new", journalEntryNew)
	m.Post("/update", binding.Bind(Entry{}), journalEntryUpdate)

	journalSync = MakeSyncPage("journal")
	m.Get("/sync", journalSync.Handler())
}
