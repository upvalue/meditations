package main

import (
	"encoding/json"
	"log"
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

func syncEntry(e Entry) {
	DB.Where("id = ?", e.ID).Preload("Tags").First(&e)
	log.Printf("%+v", e)
	json, err := json.Marshal(e)
	checkErr(err)
	journalSync.Sync(json)
}

func journalEntries(c *macaron.Context) {
	date, err := time.Parse("2006-01", c.Query("date"))
	if err != nil {
		serverError(c, "error parsing date %s", c.Query("date"))
		return
	}
	var entries []Entry
	from, to := between(date, ScopeMonth)
	DB.Where("date between ? and ?", from, to).Order("`date` desc").Preload("Tags").Find(&entries)
	c.JSON(200, entries)
}

func journalEntriesByTag(c *macaron.Context) {
	var tag Tag
	var entries []Entry

	DB.Where("name = ?", c.Params("name")).Find(&tag)
	log.Printf("%v\n", tag)
	rows, _ := DB.Table("entry_tags").Where("tag_id = ?", tag.ID).Select("entry_id").Rows()

	defer rows.Close()
	for rows.Next() {
		var entry_id int
		var entry Entry
		rows.Scan(&entry_id)
		DB.Where("id = ?", entry_id).Preload("Tags").Find(&entry)
		entries = append(entries, entry)
	}

	// TODO: How to get Entries easier?
	c.JSON(200, entries)
}

func journalNew(c *macaron.Context) {
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

func journalUpdate(c *macaron.Context, entry_update Entry) {
	var entry Entry
	DB.Where("id = ?", entry_update.ID).Find(&entry)
	entry.Body = entry_update.Body
	DB.Save(&entry)
	syncEntry(entry)
}

func getTag(c *macaron.Context) (Entry, Tag) {
	var entry Entry
	var tag Tag

	log.Printf("%s\n", c.Params("tag"))
	DB.Where("id = ?", c.ParamsInt("id")).Find(&entry)
	DB.Where(Tag{Name: c.Params("tag")}).FirstOrCreate(&tag)

	return entry, tag
}

func journalAddTag(c *macaron.Context) {
	entry, tag := getTag(c)
	DB.Model(&entry).Association("Tags")
	DB.Model(&entry).Association("Tags").Append(tag)

	c.JSON(200, entry)
}

func journalRemoveTag(c *macaron.Context) {
	entry, tag := getTag(c)
	DB.Model(&entry).Association("Tags")
	DB.Model(&entry).Association("Tags").Delete(tag)

	c.JSON(200, entry)
}

func journalInit(m *macaron.Macaron) {
	m.Get("/", func(c *macaron.Context) {
		c.HTML(200, "journal")
	})

	m.Get("/entries/date", journalEntries)
	m.Get("/entries/tag/:name", journalEntriesByTag)
	m.Post("/new", journalNew)
	m.Post("/update", binding.Bind(Entry{}), journalUpdate)
	m.Post("/add-tag/:id/:tag", journalAddTag)
	m.Post("/remove-tag/:id/:tag", journalRemoveTag)

	journalSync = MakeSyncPage("journal")
	m.Get("/sync", journalSync.Handler())
}
