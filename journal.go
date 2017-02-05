package main

import (
	"encoding/json"
	"fmt"
	"log"
	"sort"
	"time"

	"github.com/go-macaron/binding"
	"github.com/jinzhu/gorm"
	"github.com/jinzhu/now"
	"gopkg.in/macaron.v1"
)

type Entry struct {
	gorm.Model
	Date     time.Time
	Name     string
	Wiki     bool
	Body     string
	LastBody string
	Tags     []Tag `gorm:"many2many:entry_tags"`
}

type Tag struct {
	gorm.Model
	Name string
}

var journalSync *SyncPage = MakeSyncPage("journal")

func syncEntry(e Entry) {
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
	//DB.Where("(wiki = 0 or wiki is null) and date between ? and ?", from, to).Order("date desc, created_at desc").Preload("Tags").Find(&entries)
	DB.Where("date between ? and ?", from, to).Order("date desc, created_at desc").Preload("Tags").Find(&entries)
	c.JSON(200, entries)
}

func journalNamedEntry(c *macaron.Context) {
	var entry Entry
	DB.Where("name = ?", c.Params("name")).Preload("tags").First(&entry)
	c.JSON(200, entry)
}

func journalWikiIndex(c *macaron.Context) {
	var entries []Entry
	DB.Where("name is not null").Order("name asc").Preload("tags").Find(&entries)
	c.JSON(200, entries)
}

type ByDate []Entry

func (e ByDate) Len() int {
	return len(e)
}

func (s ByDate) Swap(i, j int) {
	s[i], s[j] = s[j], s[i]
}

func (s ByDate) Less(i, j int) bool {
	return s[i].Date.After(s[j].Date)
}

func journalEntriesByTag(c *macaron.Context) {
	var tag Tag
	var entries []Entry

	DB.Where("name = ?", c.Params("name")).Find(&tag)
	log.Printf("%v\n", tag)
	rows, _ := DB.Table("entry_tags").Where("tag_id = ?", tag.ID).Select("entry_id").Rows()

	// TODO: How to pull Entries belonging to Tags?
	defer rows.Close()
	for rows.Next() {
		var entry_id int
		var entry Entry
		rows.Scan(&entry_id)
		DB.Where("id = ?", entry_id).Preload("Tags").Find(&entry)
		entries = append(entries, entry)
	}

	sort.Sort(ByDate(entries))

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

	entry.Date = date
	entry.Body = "Click to edit"
	DB.Save(&entry)
	DB.Exec("update entries set name = null where id = ?", entry.ID)
	c.JSON(200, entry)
}

func journalUpdate(c *macaron.Context, entry_update Entry) {
	var entry Entry
	DB.Where("id = ?", entry_update.ID).Preload("Tags").Find(&entry)
	if entry_update.Body == "" || entry_update.Body == entry.Body {

	} else {
		entry.LastBody = entry.Body
		entry.Body = entry_update.Body
		DB.Save(&entry)
		if entry.Name == "" {
			DB.Exec("update entries set name = null where id = ?", entry.ID)
		}
		syncEntry(entry)
	}
}

func getTag(c *macaron.Context) (Entry, Tag) {
	var entry Entry
	var tag Tag

	log.Printf("%s\n", c.Params("tag"))
	DB.Where("id = ?", c.ParamsInt("id")).Preload("Tags").Find(&entry)
	DB.Where(Tag{Name: c.Params("tag")}).FirstOrCreate(&tag)

	return entry, tag
}

func journalAddTag(c *macaron.Context) {
	entry, tag := getTag(c)
	DB.Model(&entry).Association("Tags")
	DB.Model(&entry).Association("Tags").Append(tag)

	c.JSON(200, entry)
	syncEntry(entry)
}

func journalRemoveTag(c *macaron.Context) {
	entry, tag := getTag(c)
	DB.Model(&entry).Association("Tags")
	DB.Model(&entry).Association("Tags").Delete(tag)

	c.JSON(200, entry)
	syncEntry(entry)
}

func journalTags(c *macaron.Context) {
	type TagCount struct {
		Tag   Tag
		Count int
	}

	var tags []Tag
	var results []TagCount

	DB.Find(&tags)

	for _, tag := range tags {
		count := TagCount{
			Tag: tag,
		}
		row := DB.Raw("select count(*) from entry_tags where tag_id = ?", tag.ID).Row()
		row.Scan(&count.Count)
		fmt.Printf("I got me a tag %v\n", count)
		if count.Count > 0 {
			results = append(results, count)
		}
	}

	c.JSON(200, results)
}

func journalDeleteEntry(c *macaron.Context) {
	var entry Entry

	DB.Where("id = ?", c.ParamsInt("id")).First(&entry).Delete(&entry)

	c.PlainText(200, []byte("OK"))
}

func journalNameEntry(c *macaron.Context) {
	var entry Entry
	DB.Where("id = ?", c.ParamsInt("id")).First(&entry)

	entry.Name = c.Params("name")
	DB.Save(&entry)

	c.PlainText(200, []byte("ok"))
}

func journalPromoteEntry(c *macaron.Context) {
	var entry Entry
	DB.Where("id = ?", c.ParamsInt("id")).First(&entry)

	entry.Wiki = true
	DB.Save(&entry)

	c.PlainText(200, []byte("ok"))
}

func journalIndex(c *macaron.Context) {
	// Display chronological navigation information
	var first, last Entry

	err := DB.Order("date").Limit(1).First(&first).Error
	DB.Order("date desc").Limit(1).First(&last)

	// Struct for rendering info about links
	type Link struct {
		Date  string
		Count int
		Sub   []Link
		Link  string
	}

	var years []Link

	if err == nil {
		d := now.New(first.Date).BeginningOfMonth()
		e := now.New(last.Date).EndOfMonth()
		fmt.Printf("%v %v\n", d, e)

		year := Link{Date: d.Format("2006"), Count: 0}
		for ; d.Year() < e.Year() || d.Month() <= e.Month(); d = d.AddDate(0, 1, 0) {
			rows, err := DB.Table("entries").Select("count(*)").Where("date between ? and ? and deleted_at is null", d.Format(DateFormat), d.AddDate(0, 1, -1).Format(DateFormat)).Rows()
			if err == nil {
				var count int
				rows.Next()
				rows.Scan(&count)
				rows.Close()
				year.Sub = append([]Link{Link{Date: d.Format("January"), Count: count, Link: d.Format("2006-02")}}, year.Sub...)
				// At end of year
				if (d.Year() != d.AddDate(0, 1, 0).Year()) || (d.Year() == e.Year() && d.AddDate(0, 1, 0).Month() > e.Month()) {
					// Get count of yearly stuff

					rows, _ := DB.Table("Entries").Select("count(*)").Where("date between ? and ? and deleted_at is null",
						now.New(d).BeginningOfYear().Format("2006-02-01"), now.New(d).EndOfYear().Format("2006-02-01")).Rows()
					rows.Next()
					rows.Scan(&year.Count)
					rows.Close()

					// prepend year
					years = append([]Link{year}, years...)
					year = Link{Date: d.AddDate(0, 1, 0).Format("2006"), Count: 0}
				}
			}
		}
	}

	c.Data["Years"] = years
	c.HTML(200, "journal")
}

func journalInit(m *macaron.Macaron) {
	m.Get("/", journalIndex)
	m.Get("/entries/date", journalEntries)
	m.Get("/entries/tag/:name", journalEntriesByTag)
	m.Get("/entries/name/:name", journalNamedEntry)
	m.Get("/entries/wiki-index", journalWikiIndex)
	m.Get("/tags", journalTags)

	m.Post("/new", journalNew)
	m.Post("/update", binding.Bind(Entry{}), journalUpdate)
	m.Post("/add-tag/:id/:tag", journalAddTag)
	m.Post("/remove-tag/:id/:tag", journalRemoveTag)
	m.Post("/delete-entry/:id", journalDeleteEntry)
	m.Post("/name-entry/:id/:name", journalNameEntry)
	m.Post("/promote-entry/:id", journalPromoteEntry)

	m.Get("/sync", journalSync.Handler())
}
