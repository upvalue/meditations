// database.go - Database open, close and migration
package backend

import (
	"github.com/jinzhu/gorm"
	_ "github.com/mattn/go-sqlite3"
)

var DB *gorm.DB

func DBOpen() {
	db, err := gorm.Open("sqlite3", Config.DBPath)
	checkErr(err)
	DB = db
	DB.LogMode(Config.DBLog)
}

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

func DBCreate() {
	day, month, year, bucket := Scope{Name: "Day"}, Scope{Name: "Month"}, Scope{Name: "Year"}, Scope{Name: "Bucket"}

	// lazily create scopes
	DB.Create(&day)
	DB.Create(&month)
	DB.Create(&year)
	DB.Create(&bucket)
}

func DBClose() {
	DB.Close()
}

func DBLoadTutorial() {
}

func DBRepair() {

}
