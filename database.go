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
}

func DBCreate() {
	DBMigrate()
	//daily, monthly, yearly, bucket := Scope{"Daily"}, Scope{"Monthly"}, Scope{"Yearly"}, Scope{"Bucket"}
	var day Scope
	day.Name = "Day"
	DB.Create(&day)

	var month Scope
	month.Name = "Month"
	DB.Create(&month)

	var year Scope
	year.Name = "Year"
	DB.Create(&year)

	var bucket Scope
	bucket.Name = "Bucket"
	DB.Create(&bucket)
}

func DBClose() {
	DB.Close()
}
