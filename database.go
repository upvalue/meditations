// models.go - Database code
package main

import (
	"github.com/jinzhu/gorm"
	_ "github.com/mattn/go-sqlite3"
)

var DB *gorm.DB

func DBOpen() {
	db, err := gorm.Open("sqlite3", Config.DBPath)
	checkErr(err)
	DB = &db
	DB.LogMode(Config.DBLog)

}

func DBMigrate() {
	// habits.go
	DB.AutoMigrate(&Task{}, &Comment{}, &Scope{})
	// journal.go
	DB.AutoMigrate(&Entry{}, &Tag{})
	// wiki.go
	DB.AutoMigrate(&Page{}, &Revision{})
}

func DBCreate() {
	DBMigrate()
	day, month, year, bucket := Scope{Name: "Day"}, Scope{Name: "Month"}, Scope{Name: "Year"}, Scope{Name: "Bucket"}
	DB.Create(&day).Create(&month).Create(&year).Create(&bucket)
}

func DBClose() {
	DB.Close()
}
