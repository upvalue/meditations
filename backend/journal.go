package backend

import (
	"fmt"
	"log"
	"sort"
	"time"

	"github.com/go-macaron/binding"
	"github.com/jinzhu/gorm"
	"gopkg.in/macaron.v1"
)

// Entry represents a journal entry
type Entry struct {
	gorm.Model
	Date     time.Time
	Name     string
	Body     string
	LastBody string
	Tags     []Tag `gorm:"many2many:entry_tags"`
}

// Tag represents a journal tag; many-to-many relationship with entries
type Tag struct {
	gorm.Model
	Name string
}

var journalSync = MakeSyncPage("journal")

// syncEntry sends a modified entry to the client
func syncEntry(e Entry) {
	journalSync.Send("UPDATE_ENTRY", e)
}

func journalEntries(c *macaron.Context) {
	date, err := time.Parse("2006-01", c.Query("date"))
	if err != nil {
		serverError(c, "error parsing date %s", c.Query("date"))
		return
	}
	var entries []Entry
	from, to := between(date, ScopeMonth)
	DB.Where("date between ? and ?", from, to).Order("date desc").Order("created_at desc").Preload("Tags").Find(&entries)
	c.JSON(200, entries)
}

func journalNamedEntry(c *macaron.Context) {
	var entry Entry
	DB.Where("name = ?", c.Params("name")).Preload("Tags").First(&entry)
	if entry.ID == 0 {
		c.PlainText(404, []byte("ENTRY NOT FOUND"))
	} else {
		c.JSON(200, entry)
	}
}

// ByDate allows sorting by date
type ByDate []Entry

// Len length
func (s ByDate) Len() int {
	return len(s)
}

// Swap
func (s ByDate) Swap(i, j int) {
	s[i], s[j] = s[j], s[i]
}

// Less
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
		var entryID int
		var entry Entry
		rows.Scan(&entryID)
		DB.Where("id = ?", entryID).Preload("Tags").Find(&entry)
		entries = append(entries, entry)
	}

	sort.Sort(ByDate(entries))

	// TODO: How to get Entries easier?
	c.JSON(200, entries)
}

// journalTagAutoComplete suggests autocompletes for tags
func journalTagAutocomplete(c *macaron.Context) {
	var tags Tag

	DB.Where("name like ?", fmt.Sprintf("%s%%", c.Params("name"))).Find(&tags)

	c.JSON(200, tags)
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

	journalSync.Send("CREATE_ENTRY", entry)
	syncSidebarChrono()
}

func journalUpdate(c *macaron.Context, entryUpdate Entry) {
	var entry Entry
	DB.Where("id = ?", entryUpdate.ID).Preload("Tags").Find(&entry)
	if entryUpdate.Body == "" || entryUpdate.Body == entry.Body {

	} else {
		entry.LastBody = entry.Body
		entry.Body = entryUpdate.Body
		DB.Save(&entry)
		// TODO: Why is this here?
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
	syncSidebarTags()
}

func journalRemoveTag(c *macaron.Context) {
	entry, tag := getTag(c)
	DB.Model(&entry).Association("Tags")
	DB.Model(&entry).Association("Tags").Delete(tag)

	c.JSON(200, entry)
	syncEntry(entry)
	syncSidebarTags()
}

func journalDeleteEntry(c *macaron.Context) {
	var entry Entry
	id := c.ParamsInt("id")

	DB.Where("id = ?", id).First(&entry).Delete(&entry)
	DB.Exec("DELETE FROM entry_tags WHERE entry_id = ?", id)

	c.PlainText(200, []byte("OK"))
	journalSync.Send("DELETE_ENTRY", id)
}

func journalRemoveEntryName(c *macaron.Context) {
	DB.Table("entries").Where("id = ?", c.ParamsInt("id")).Update("name", gorm.Expr("NULL"))

	var entry Entry
	DB.Where("id = ?", c.ParamsInt("id")).Preload("Tags").First(&entry)

	syncEntry(entry)
	syncSidebarNamed()

	c.PlainText(200, []byte("OK"))
}

func journalNameEntry(c *macaron.Context) {
	var entry Entry
	DB.Where("id = ?", c.ParamsInt("id")).Preload("Tags").First(&entry)

	entry.Name = c.Params("name")
	DB.Save(&entry)

	syncEntry(entry)
	syncSidebarNamed()

	c.PlainText(200, []byte("ok"))
}

func journalSearch(c *macaron.Context) {
	journalSync.Send("SEARCH", "hello")
}

func journalIndex(c *macaron.Context) {
	c.Data["Page"] = "journal"
	c.HTML(200, "journal")
}

func journalInit(m *macaron.Macaron) {
	m.Get("/", journalIndex)
	m.Get("/entries/date", journalEntries)
	m.Get("/entries/tag/:name", journalEntriesByTag)
	m.Get("/entries/name/:name", journalNamedEntry)
	m.Get("/tags/autocomplete", journalTagAutocomplete)

	m.Post("/sidebar", journalSidebarInfo)
	m.Post("/new", journalNew)
	m.Post("/update", binding.Bind(Entry{}), journalUpdate)
	m.Post("/add-tag/:id/:tag", journalAddTag)
	m.Post("/remove-tag/:id/:tag", journalRemoveTag)
	m.Post("/delete-entry/:id", journalDeleteEntry)
	m.Post("/name-entry/:id/:name", journalNameEntry)
	m.Post("/name-entry/:id/", journalRemoveEntryName)

	m.Post("/search/:string", journalSearch)

	m.Get("/sync", journalSync.Handler())
}
