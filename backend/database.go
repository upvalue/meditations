package backend

// database.go - Database open, close and migration

import (
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
	DB.Exec("pragma foreign_keys = on;")
	DB.AutoMigrate(
		// habits.go
		&Task{}, &Comment{}, &Scope{},
		// journal.go
		&Entry{}, &Tag{},
	)
	DBCreate()
}

// DBCreate create a new database
func DBCreate() {
	day, month, year, bucket := Scope{Name: "Day"}, Scope{Name: "Month"}, Scope{Name: "Year"}, Scope{Name: "Bucket"}

	// lazily create scopes
	DB.Create(&day)
	DB.Create(&month)
	DB.Create(&year)
	DB.Create(&bucket)
}

// DBClose close database handle
func DBClose() {
	DB.Close()
}

// DBRepair fix potential inconsistencies such as tags pointing to dead entries
func DBRepair() {

}
