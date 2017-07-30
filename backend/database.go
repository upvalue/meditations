package backend

// database.go - Database open, close, migration, and repair

import (
	"fmt"
	"log"
	"math/rand"
	"time"

	"github.com/jinzhu/gorm"
	_ "github.com/mattn/go-sqlite3" // load sqlite3 driver
)

// DB global database handle
var DB *gorm.DB

// DBOpen open database
func DBOpen() {
	db, err := gorm.Open("sqlite3", Config.DBPath)
	checkErr(err)
	DB = db
	DB.LogMode(Config.DBLog)
}

// DBMigrate run database migration
func DBMigrate() {
	// habits.go
	DB.LogMode(true)
	log.Printf("Migrating database")
	DB.Exec("pragma foreign_keys = on;")
	DB.AutoMigrate(
		// app.go
		&Settings{},
		// habits.go
		&Task{}, &Comment{}, &Scope{},
		// journal.go
		&Entry{}, &Tag{},
	)
	DBCreate()

	// By hand migrations
	settings := Settings{Name: "settings"}
	DB.First(&settings)

	DB.LogMode(false)
}

// DBCreate initialize a new database; will not overwrite existing settings.
func DBCreate() {
	day, month, year, bucket := Scope{Name: "Day"}, Scope{Name: "Month"}, Scope{Name: "Year"}, Scope{Name: "Bucket"}

	// lazily create scopes
	DB.Save(&day)
	DB.Save(&month)
	DB.Save(&year)
	DB.Save(&bucket)

	settings := Settings{Name: "settings", Schema: 1}

	DB.FirstOrCreate(&settings)
}

func seedTask(name string, date time.Time, scope int, status int, comment string) *Task {
	task := Task{
		Name:   name,
		Date:   date,
		Scope:  scope,
		Status: status,
	}
	if comment != "" {
		task.Comment = Comment{
			Body: comment,
		}
	}
	return &task
}

// DBSeed seeds the database with example data, suitable for testing or the demo/tutorial
// application. Accepts an optional date argument to start from (for reproducible tests), if empty
// string is provided, seeds from the current day
func DBSeed(seedFrom string) {
	var day time.Time
	if seedFrom == "" {
		day = time.Now()
	} else {
		day, _ = time.Parse("2006-01", seedFrom)
	}

	// deterministic random values
	rand.Seed(12345)

	DB.LogMode(false)
	tx := DB.Begin()

	// Generate 2 years of tasks with some random functions
	for i := 0; i < 365*2; i++ {
		// Diet will have some calories logged as a comment, and success based on that random number
		calories := rand.Intn(500) + 2350

		status := TaskComplete
		if calories > 2500 {
			status = TaskIncomplete
		}

		tx.Save(seedTask("Diet", day, ScopeDay, status, fmt.Sprintf("%d calories\n", calories)))
		tx.Save(seedTask("Exercise", day, ScopeDay, TaskComplete, ""))

		if day.Day() == 1 {
			// Add month tasks on first of day
			tx.Save(seedTask("Diet", day, ScopeMonth, status, "Eat less than 2500 calories a day"))
			tx.Save(seedTask("Exercise", day, ScopeMonth, TaskComplete, "Run every day"))
		}

		if day.AddDate(0, 0, -1).Year() != day.Year() {
			tx.Save(seedTask("Diet", day, ScopeYear, status, "Eat less than 2500 calories a day"))
			tx.Save(seedTask("Exercise", day, ScopeYear, TaskComplete, "Run every day"))
		}

		day = day.AddDate(0, 0, -1)
	}

	// TODO: Projects.

	tx.Commit()
}

// repairScope repairs a specific scope
func repairScope(repair bool, scope int, datefmt string, date string) (int, int) {
	outOfOrderTasks := 0

	var tasks []Task
	if scope < ScopeProject {
		DB.Where("strftime(?, date) = ? AND scope = ?", datefmt, date, scope).Order("`order` asc").Find(&tasks)
	} else {
		DB.Where("scope = ?", scope).Order("`order` asc").Find(&tasks)
	}

	for i, t := range tasks {
		if t.Order != i {
			outOfOrderTasks++
			fmt.Printf("Task %v scope %v %v: expected task at position %v but order is %v\n", t.ID, scope, date, i, t.Order)
			if repair == true {
				t.Order = i
				DB.Save(&t)
			}
		}
	}

	if outOfOrderTasks > 0 {
		return 1, outOfOrderTasks
	}

	return 0, 0
}

// repairRange repairs a range of DB scopes
func repairRange(repair bool, scope int, datefmt string) (int, int) {
	var dates []struct{ Date string }
	DB.Raw("SELECT DISTINCT strftime(?, date) as date FROM tasks WHERE deleted_at is NULL AND scope = ? ORDER BY date asc", datefmt, scope).Scan(&dates)
	cs, ct := 0, 0
	for _, row := range dates {
		ds, dt := repairScope(repair, scope, datefmt, row.Date)
		cs += ds
		ct += dt
	}
	return cs, ct
}

// DBRepair checks for database issues (such as out-of-order tasks) that may have been caused by
// using a bugged version of meditations
func DBRepair(repair bool) {
	// Check for out-of-order tasks
	outOfOrderTasks, outOfOrderScopes := 0, 0
	DB.LogMode(false)

	fmt.Printf("!!! Fixing out of order tasks\n")

	ds, dt := repairRange(repair, ScopeDay, "%Y-%m-%d")
	outOfOrderScopes += ds
	outOfOrderTasks += dt

	ds, dt = repairRange(repair, ScopeMonth, "%Y-%m")
	outOfOrderScopes += ds
	outOfOrderTasks += dt

	ds, dt = repairRange(repair, ScopeYear, "%Y")
	outOfOrderScopes += ds
	outOfOrderTasks += dt

	var projectScopes []struct{ Scope int }
	DB.Raw("SELECT DISTINCT scope as scope FROM tasks WHERE scope >= ?", ScopeProject).Scan(&projectScopes)
	for _, row := range projectScopes {
		ds, dt := repairScope(repair, row.Scope, "", "Project scope")

		outOfOrderScopes += ds
		outOfOrderTasks += dt
	}

	fmt.Printf("!!! REPORT: %v scopes out of order, %v tasks out of order\n", outOfOrderScopes, outOfOrderTasks)

	var entryTags []struct {
		EntryID int
		TagID   int
	}
	DB.Raw("SELECT entry_id, tag_id FROM entry_tags").Scan(&entryTags)
	DB.LogMode(false)
	deadEntries := 0
	for _, row := range entryTags {
		var count struct{ Count int }
		DB.Raw("SELECT count(*) as count FROM entries WHERE id = ? AND deleted_at IS NOT NULL", row.EntryID).Scan(&count)
		if count.Count > 0 {
			fmt.Printf("tag %v references deleted entry %v\n", row.TagID, row.EntryID)
			deadEntries++
			if repair == true {
				DB.Exec("DELETE FROM entry_tags WHERE entry_id = ? and tag_id = ?", row.EntryID, row.TagID)
			}
		}
	}
	fmt.Printf("!!! REPORT: %v dead entries", deadEntries)
}

// DBClose close database handle
func DBClose() {
	DB.Close()
}
