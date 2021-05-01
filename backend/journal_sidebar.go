package backend

// journal_sidebar.go - Journal sidebar implementation

import (
	"time"

	macaron "gopkg.in/macaron.v1"
)

// ChronoLink represents a link to view a month, or a year expandable to month links
type ChronoLink struct {
	Date  string
	Count int
	Sub   []ChronoLink
	Link  string
}

// TagLink is a link to a tag, including how many entries are in it
type TagLink struct {
	Name  string
	Count int
}

// NameLink is a link to a named journal entry
type NameLink struct {
	Name string
	ID   string
	Href string
	Sub  []NameLink
}

// Sidebar represents all link information
type Sidebar struct {
	ChronoLinks []ChronoLink
	TagLinks    []TagLink
	NameLinks   []NameLink
}

var sidebar Sidebar

// calculateSidebar fetches sidebar info from the DB and places it in a struct
func sidebarCalculate(chrono bool, tag bool, alpha bool) {
	//  This is a quite inefficient way of doing things. A full 1/3 of the sidebar is recalculated
	// when something changes, and the whole UI is updated. But it seems fast enough as is and thus
	// not worth the additional complexity that a more incremental update scheme would require.

	if chrono {
		// Display chronological navigation information
		years := []ChronoLink{}

		var yearsindb []struct{ Year string }
		DB.Raw("SELECT DISTINCT strftime('%Y', date) as year FROM entries WHERE deleted_at is not null ORDER BY date desc").Scan(&yearsindb)

		for _, row := range yearsindb {
			datestr := row.Year

			var count struct{ Count int }
			sub := []ChronoLink{}

			var monthsinyear []struct{ Datestr string }
			DB.Raw("SELECT DISTINCT strftime('%Y-%m', date) as datestr from entries where strftime('%Y', date) = ? order by date desc", datestr).Scan(&monthsinyear)

			for _, row := range monthsinyear {
				monthstr := row.Datestr

				d, _ := time.Parse("2006-01", monthstr)
				DB.Raw("SELECT count(*) as count from entries where strftime('%Y-%m', date) = ?", monthstr).Scan(&count)
				sub = append(sub, ChronoLink{Date: d.Format("January"), Link: d.Format("2006-01"), Count: count.Count})
			}
			DB.Raw("SELECT count(*) as count from entries where strftime('%Y', date) = ?", datestr).Scan(&count)

			year := ChronoLink{Date: datestr, Count: count.Count, Sub: sub}
			years = append(years, year)
		}

		sidebar.ChronoLinks = years
	}

	// Return tagged entries
	if tag {
		var tags []Tag
		var tagLinks []TagLink

		DB.Order("name").Find(&tags)
		for _, tag := range tags {
			var count int
			row := DB.Raw("select count(*) from entry_tags where tag_id = ?", tag.ID).Row()
			row.Scan(&count)
			if count > 0 {
				tagLinks = append(tagLinks, TagLink{Name: tag.Name, Count: count})
			}
		}

		sidebar.TagLinks = tagLinks
	}

	// Return named entries
	if alpha {
		var nameLinks []NameLink
		var nameEntries []Entry
		DB.Where("name is not null and deleted_at is null").Order("name").Find(&nameEntries)

		for _, entry := range nameEntries {
			nameLinks = append(nameLinks, NameLink{Name: entry.Name})
		}

		sidebar.NameLinks = nameLinks
	}

}

// sidebarUpdate updates synced users sidebars when things are changed
func syncSidebar(chrono bool, tag bool, alpha bool) {
	sidebarCalculate(chrono, tag, alpha)
	journalSync.Send("SIDEBAR", sidebar)
}

func syncSidebarChrono() {
	syncSidebar(true, false, false)
}

func syncSidebarNamed() {
	syncSidebar(false, false, true)
}

func syncSidebarTags() {
	syncSidebar(false, true, false)
}

// journalSidebarInfo sends a full copy of the sidebar
func journalSidebarInfo(c *macaron.Context) {
	syncSidebar(true, true, true)

	serverOK(c)
}
