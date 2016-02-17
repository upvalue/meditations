// text.go - Common table for most textual data, with revision functionality
package main

import "github.com/jinzhu/gorm"

type Revision struct {
	gorm.Model
	TextID uint
	Number uint
	Body   string
}

type Text struct {
	gorm.Model
	Tags      []Tag `gorm:"many2many:text_tags"`
	Revisions []Revision
}
