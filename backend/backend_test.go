package backend

import (
	"encoding/json"
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

func TestStatistics(t *testing.T) {
	var task Task

	DB.Where("name = 'Exercise' and scope = 3 and strftime('%Y', date) = '2017'").First(&task)

	task.CalculateStats()

	if task.BestStreak != 212 {
		t.Fail()
	}

	if task.Streak != 212 {
		t.Fail()
	}
}

// TestGraphQL tests the most basic possible GraphQL query
func TestGraphQL(t *testing.T) {
	result := executeQuery("{\n\tping\n}", schema)
	bytes, _ := json.Marshal(result.Data)
	json := string(bytes)

	if json != "{\"ping\":\"pong\"}" {
		t.Fail()
	}
}

func TestMain(m *testing.M) {
	graphqlInitialize()
	Config.DBPath = ":memory:"
	DBOpen()
	DBSeed("2017-07")
	// DB Seed
	os.Exit(m.Run())
}
