package backend

import (
	"os"
	"testing"
)

// TestSeed tests that DB has been seeded properly
func TestSeed(t *testing.T) {
	var task Task

	DB.Where("name = 'Exercise'").First(&task)

	if task.ID == 0 {
		t.Fail()
	}
}

func TestMain(m *testing.M) {
	Config.DBPath = ":memory:"
	Config.DBLog = true
	DBOpen()
	DBMigrate()
	DBSeed("2017-06")
	// DB Seed
	os.Exit(m.Run())
}
