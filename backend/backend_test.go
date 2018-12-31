package backend

import (
	"encoding/json"
	"fmt"
	"os"
	"strings"
	"testing"

	"github.com/jmoiron/jsonq"
)

/**
 * Tests. The primary method of testing used here is integration testing. We run GraphQL queries
 * against an actual in-memory database generated with seeding
 */

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

// This is positively silly, but the easiest way to deal with this complex result
// object for testing purposes in my estimation: convert it to json, then use one of the
// many json query libraries to interface with it
func graphqlToJSON(t *testing.T, query string) *jsonq.JsonQuery {
	result := executeQuery(query)

	if result.HasErrors() {
		t.FailNow()
	}

	bytes, err := json.Marshal(result.Data)

	if err != nil {
		fmt.Printf("%v\n", err)
		t.FailNow()
	}

	data := map[string]interface{}{}
	dec := json.NewDecoder(strings.NewReader(string(bytes)))
	dec.Decode(&data)
	jq := jsonq.NewQuery(data)

	return jq
}

// TestGraphQL tests the most basic possible GraphQL query
func TestBasicGraphQL(t *testing.T) {
	json := graphqlToJSON(t, "{ ping }")
	str, err := json.String("ping")
	if err != nil || str != "pong" {
		t.FailNow()
	}
}

func TestTasksByDate(t *testing.T) {
	/*
		jq := graphqlToJSON(t, `{ tasksByDate(scopes: [MONTH], date: "2017-07-01") { Month { Name } } }`)
		str, _ := jq.String("tasksByDate", "Month", "0", "Name")

		if str != "Diet" {
			t.FailNow()
		}

	*/
}

func TestMain(m *testing.M) {
	graphqlInitialize()
	Config.DBPath = ":memory:"
	DBOpen()
	DBSeed("2017-07")
	// DB Seed
	os.Exit(m.Run())
}
