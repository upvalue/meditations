package backend

import (
	"os"
	"testing"
)

func TestHello(t *testing.T) {

}

func TestMain(m *testing.M) {
	Config.DBPath = ":memory:"
	Config.DBLog = true
	DBOpen()
	DBMigrate()
	DBClose()
	// DB Seed
	os.Exit(m.Run())
}
