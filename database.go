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
	DB.AutoMigrate(&Task{}, &Comment{})
}

func DBClose() {
	DB.Close()
}
