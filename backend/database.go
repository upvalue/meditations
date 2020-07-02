package backend

// database.go - Database open, close, migration, and repair

import (
	"bufio"
	"fmt"
	"log"
	"os"

	"github.com/jinzhu/gorm"
	_ "github.com/jinzhu/gorm/dialects/postgres" // load postgres dialect
	_ "github.com/jinzhu/gorm/dialects/sqlite"   // load sqlite3 dialect
	_ "github.com/mattn/go-sqlite3"              // load sqlite3 driver
)

const (
	// SchemaVersion is the current version of the meditations DB schema
	SchemaVersion = 4
)

// DB global database handle
var DB *gorm.DB

// DBOpen open database
func DBOpen() {
	var db *gorm.DB
	var err error
	if Config.DBType == "postgres" {
		fmt.Printf("%s\n", Config.DBPath)
		db, err = gorm.Open("postgres", Config.DBPath)
	} else {
		db, err = gorm.Open("sqlite3", Config.DBPath)
	}
	checkErr(err)
	DB = db
	DB.LogMode(Config.DBLog)
}

// DBMigrate run database migration
func DBMigrate() {
	// habits.go
	log.Printf("Migrating database")
	DB.Exec("pragma foreign_keys = on;")
	DB.AutoMigrate(
		// app.go
		&Settings{},
		// habits.go
		&Task{}, &Scope{},
		// journal.go
		&Entry{}, &Tag{},
	)
	DB.AutoMigrate(&EntrySave{})
	DBCreate()

	DB.Exec("CREATE INDEX IF NOT EXISTS idx_tasks_date ON tasks (date);")
	DB.Exec("CREATE INDEX IF NOT EXISTS idx_entries_date ON entries (date);")
	DB.Exec("CREATE INDEX IF NOT EXISTS idx_tasks_date_scope ON tasks (date, scope);")
	DB.Exec("CREATE INDEX IF NOT EXISTS idx_tasks_order ON tasks (position);")
	DB.Exec("CREATE INDEX IF NOT EXISTS idx_entries_body ON entries (body collate nocase); ")

	// By hand migrations
	settings := Settings{Name: "settings"}
	DB.First(&settings)

	log.Printf("Migrating from schema version %d\n", settings.Schema)

	if settings.Schema == SchemaVersion {
		DB.LogMode(false)
		return
	}

	reader := bufio.NewReader(os.Stdin)
	fmt.Printf("Out-of-date database: migration required. Backup your database before continuing!!!\n")
	fmt.Print("Enter Y to continue: ")

	text, _ := reader.ReadString('\n')

	if text != "Y\n" {

		fmt.Printf("Got %s instead of Y, exiting", text)
		os.Exit(1)
	}

	if settings.Schema == 1 {

		log.Printf("!!! Upgrading from Schema 1 to 2")

		DB.Exec("CREATE TABLE tasks_altered(id, created_at, updated_at, deleted_at, name, date, status, scope, `order`, minutes);")
		DB.Exec("INSERT INTO tasks_altered SELECT id, created_at, updated_at, deleted_at, name, date, status, scope, `order`, (hours * 60) + minutes as minutes FROM tasks")
		DB.Exec("DROP TABLE tasks;")
		//DB.Exec("CREATE TABLE tasks(id, created_at, updated_at, deleted_at, name, date, status, scope, `order`, minutes);")
		DB.CreateTable(&Task{})
		DB.Exec("INSERT INTO tasks SELECT id, created_at, updated_at, deleted_at, name, date, status, scope, `order`, minutes FROM tasks_altered")
		DB.Exec("DROP TABLE tasks_altered")

		// DB.Model(&Task{}).DropColumn("hours")

		settings.Schema = 2
		DB.Save(&settings)
	}

	if settings.Schema == 2 {
		log.Printf("!!! Upgrading from Schema 2 to 3")
		// Collapse comments table into tasks
		DB.Exec("DELETE FROM comments WHERE comments.deleted_at IS NOT NULL;")
		DB.Exec("DELETE FROM comments WHERE rowid NOT IN (SELECT MIN(rowid) FROM comments GROUP BY task_id);")
		DB.Exec("CREATE TABLE tasks_altered(id, created_at, updated_at, deleted_at, name, date, status, scope, position, minutes, comment);")
		DB.Exec("INSERT INTO tasks_altered SELECT * FROM (SELECT tasks.id, tasks.created_at, tasks.updated_at, tasks.deleted_at, tasks.name, tasks.date, tasks.status, tasks.scope, tasks.`order`, tasks.minutes, comments.body as comment FROM tasks LEFT OUTER JOIN comments ON comments.task_id = tasks.id);")

		DB.Exec("DROP TABLE tasks;")
		DB.Exec("DROP TABLE comments;")
		DB.CreateTable(&Task{})
		DB.Exec("INSERT INTO tasks SELECT * FROM tasks_altered")

		settings.Schema = 3
		DB.Save(&settings)
	}

	if settings.Schema == 3 {
		log.Printf("!!! Upgrading from Schema 3 to 4")
		DB.Exec("ALTER TABLE entries ADD lock string;")
		settings.Schema = 4
		DB.Save(&settings)
	}

	DB.Exec("VACUUM;")

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

	settings := Settings{Name: "settings", Schema: SchemaVersion}

	DB.FirstOrCreate(&settings)
}

// repairScope repairs a specific scope
func repairScope(repair bool, scope int, datefmt string, date string) (int, int) {
	outOfOrderTasks := 0

	var tasks []Task
	if scope < ScopeProject {
		DB.Where("strftime(?, date) = ? AND scope = ?", datefmt, date, scope).Order("position asc").Find(&tasks)
	} else {
		DB.Where("scope = ?", scope).Order("position asc").Find(&tasks)
	}

	for i, t := range tasks {
		if t.Position != i {
			outOfOrderTasks++
			fmt.Printf("Task %v scope %v %v: expected task at position %v but position is %v\n", t.ID, scope, date, i, t.Position)
			if repair == true {
				t.Position = i
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
