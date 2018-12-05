// graphql.go - GraphQL resolvers
package backend

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/graphql-go/graphql"
	macaron "gopkg.in/macaron.v1"
)

var taskInterface = graphql.NewObject(graphql.ObjectConfig{
	Name:        "Task",
	Description: "Task",
	Fields: graphql.Fields{
		"ID": &graphql.Field{
			Type:        graphql.NewNonNull(graphql.Int),
			Description: "ID",
		},
		"Name": &graphql.Field{
			Type:        graphql.NewNonNull(graphql.String),
			Description: "Name",
		},
		"Minutes": &graphql.Field{
			Type:        graphql.NewNonNull(graphql.Int),
			Description: "Minutes spent on task as an integer",
		},
		"Date": &graphql.Field{
			Type:        graphql.NewNonNull(graphql.DateTime),
			Description: "Date of the task, determining its scope",
		},

		"Order": &graphql.Field{
			Type:        graphql.NewNonNull(graphql.Int),
			Description: "Task order within scope",
		},

		"Scope": &graphql.Field{
			Type:        graphql.NewNonNull(graphql.Int),
			Description: "Task scope",
		},

		"Status": &graphql.Field{
			Type:        graphql.NewNonNull(graphql.Int), //statusEnum,
			Description: "Task status",
		},

		"Comment": &graphql.Field{
			Type:        graphql.String,
			Description: "Task comment",
		},

		"CompletionRate": &graphql.Field{
			Type:        graphql.Int,
			Description: "Completion rate",
		},

		"TotalTasks": &graphql.Field{
			Type:        graphql.Int,
			Description: "Total tasks",
		},

		"CompletedTasks": &graphql.Field{
			Type:        graphql.Int,
			Description: "Completed tasks",
		},
	},
})

var dateScopeReturn = graphql.NewObject(graphql.ObjectConfig{
	Name:        "DateScopeReturn",
	Description: "A listing of tasks within a particular date scope",
	Fields: graphql.Fields{
		"Year": &graphql.Field{
			Type:        graphql.NewList(taskInterface),
			Description: "Year",
		},
		"Days": &graphql.Field{
			Type:        graphql.NewList(taskInterface),
			Description: "Days",
		},
		"Month": &graphql.Field{
			Type:        graphql.NewList(taskInterface),
			Description: "Month",
		},
	},
})

var dateScopeEnum = graphql.NewEnum(graphql.EnumConfig{
	Name:        "DateScope",
	Description: "Date scope",
	Values: graphql.EnumValueConfigMap{
		"DAYS": &graphql.EnumValueConfig{
			Value:       ScopeDay,
			Description: "Day",
		},
		"MONTH": &graphql.EnumValueConfig{
			Value:       ScopeMonth,
			Description: "Month",
		},
		"YEAR": &graphql.EnumValueConfig{
			Value:       ScopeYear,
			Description: "Year",
		},
	},
})

var queryType = graphql.NewObject(graphql.ObjectConfig{
	Name: "Query",
	Fields: graphql.Fields{
		// Ping query, just for checking
		"ping": &graphql.Field{
			Type: graphql.String,
			Resolve: func(p graphql.ResolveParams) (interface{}, error) {
				return "pong", nil
			},
		},

		// Task by id
		"task": &graphql.Field{
			Type: taskInterface,
			Args: graphql.FieldConfigArgument{
				"id": &graphql.ArgumentConfig{
					Description: "Id",
					Type:        graphql.NewNonNull(graphql.Int),
				},
			},
			Resolve: func(p graphql.ResolveParams) (interface{}, error) {
				var task Task
				DB.Where("id = ?", p.Args["id"]).First(&task)

				fmt.Printf("GOT TASK %+v", task)

				return task, nil
			},
		},

		// Tasks by date query. Pulls tasks for particular scopes given a YYYY-MM-DD date.
		"tasksByDate": &graphql.Field{
			Type: graphql.NewNonNull(dateScopeReturn),
			Args: graphql.FieldConfigArgument{
				"date": &graphql.ArgumentConfig{
					Type:        graphql.NewNonNull(graphql.String),
					Description: "Date to fetch scopes for",
				},
				"scopes": &graphql.ArgumentConfig{
					Type:        graphql.NewList(dateScopeEnum),
					Description: "Scopes to fetch for",
				},
			},
			Resolve: func(p graphql.ResolveParams) (interface{}, error) {
				type TasksByDate struct {
					Days  []Task
					Month []Task
					Year  []Task
				}

				datestr := p.Args["date"].(string)
				date, err := time.Parse(DateFormat, datestr)

				if err != nil {
					return nil, err
				}

				tasksByDate := TasksByDate{}

				fmt.Printf("Fetching scopes for date %s\n", date)
				scopes := p.Args["scopes"].([]interface{})
				for i := range scopes {
					scopei := (scopes[i]).(int)

					if scopei == ScopeMonth {
						tasksInScope(&tasksByDate.Month, ScopeMonth, date)
						for i := range tasksByDate.Month {
							tasksByDate.Month[i].CalculateStats()
						}
					} else if scopei == ScopeYear {
						tasksInScope(&tasksByDate.Year, ScopeYear, date)
						for i := range tasksByDate.Year {
							tasksByDate.Year[i].CalculateStats()
						}
					} else if scopei == ScopeDay {
						begin, end := _between(date, ScopeMonth)

						DB.
							Where("date BETWEEN ? and ? and scope = ?", begin, end, ScopeDay).Order("position asc, date asc").
							Find(&tasksByDate.Days)
					}
				}

				// fmt.Printf("%v\n", tasksByDate)

				return tasksByDate, nil
			},
		},

		"tasksInScope": &graphql.Field{
			Type: graphql.NewList(taskInterface),
			Args: graphql.FieldConfigArgument{
				"from": &graphql.ArgumentConfig{
					Description: "Begin date",
					Type:        graphql.NewNonNull(graphql.DateTime),
				},
				"to": &graphql.ArgumentConfig{
					Description: "End date",
					Type:        graphql.NewNonNull(graphql.DateTime),
				},
				"scope": &graphql.ArgumentConfig{
					Description: "Scope (optional)",
					Type:        graphql.Int,
				},
			},
			Resolve: func(p graphql.ResolveParams) (interface{}, error) {
				fromstr := p.Args["from"].(string)
				from, err := time.Parse(DateFormat, fromstr)

				if err != nil {
					return nil, err
				}

				tostr := p.Args["to"].(string)
				to, err := time.Parse(DateFormat, tostr)

				if err != nil {
					return nil, err
				}

				var tasks []Task
				DB.LogMode(true)
				db := DB.Where("date between ? and ?", from.Format(DateFormat), to.Format(DateFormat))

				var scope interface{}
				scope = p.Args["scope"]

				if scope != nil {
					db = db.Where("scope = ?", scope.(int))
				}

				db.Find(&tasks)
				fmt.Printf("%+v\n", tasks)
				DB.LogMode(false)

				return tasks, nil
			},
		},
	},
})

///// MUTATIONS

var taskInputObject = graphql.NewInputObject(graphql.InputObjectConfig{
	Name: "InputTask",
	Fields: graphql.InputObjectConfigFieldMap{
		"ID": &graphql.InputObjectFieldConfig{
			Type: graphql.Int,
		},
		"Name": &graphql.InputObjectFieldConfig{
			Type: graphql.String,
		},
		"Minutes": &graphql.InputObjectFieldConfig{
			Type: graphql.Int,
		},
		"MinutesDelta": &graphql.InputObjectFieldConfig{
			Type: graphql.Int,
		},
		"Scope": &graphql.InputObjectFieldConfig{
			Type: graphql.Int,
		},
		"Status": &graphql.InputObjectFieldConfig{
			Type: graphql.Int,
		},
		// Completely ignored. Defined here in order to allow pass through
		// of tasks that result from some queries
		"CompletedTasks": &graphql.InputObjectFieldConfig{
			Type: graphql.Int,
		},
		"TotalTasks": &graphql.InputObjectFieldConfig{
			Type: graphql.Int,
		},
		"CompletionRate": &graphql.InputObjectFieldConfig{
			Type: graphql.Int,
		},
	},
})

/*
var TaskYnterface = graphql.NewObject(graphql.ObjectConfig{
	Name: "Add tasks",
	Fields: graphql.Fields{
		"Scope": &graphql.Field{
			Type:        graphql.NewNonNull(graphql.Int),
			Description: "Scope type",
		},
		"Date": &graphql.Field{
			Type:        graphql.NewNonNull(graphql.DateTime),
			Description: "Scope date",
		},
		"TaskNames": &graphql.Field{
			Type:        graphql.NewList(graphql.String),
			Description: "Task names",
		},
	},
})
*/

var mutationType = graphql.NewObject(graphql.ObjectConfig{
	Name: "Mutation",
	Fields: graphql.Fields{
		"updateTask": &graphql.Field{
			Type: taskInterface,
			Args: graphql.FieldConfigArgument{
				"id": &graphql.ArgumentConfig{
					Type:        graphql.NewNonNull(graphql.Int),
					Description: "Task ID",
				},
				"task": &graphql.ArgumentConfig{
					Type:        graphql.NewNonNull(taskInputObject),
					Description: "Task fields to update",
				},
			},
			Resolve: func(p graphql.ResolveParams) (interface{}, error) {
				var task Task

				DB.Where("id = ?", p.Args["ID"].(int)).Find(&task)

				inputTask := p.Args["task"].(map[string]interface{})

				if val, ok := inputTask["Status"]; ok {
					task.Status = val.(int)
				}

				DB.Save(&task)

				return task, nil
			},
		},

		// Update or add task by name for a particular day
		"updateOrAddTaskByName": &graphql.Field{
			Type: taskInterface,
			Args: graphql.FieldConfigArgument{
				"date": &graphql.ArgumentConfig{
					Type:        graphql.NewNonNull(graphql.String),
					Description: "Day to add or update task on",
				},
				"name": &graphql.ArgumentConfig{
					Type:        graphql.NewNonNull(graphql.String),
					Description: "Task name",
				},
				"task": &graphql.ArgumentConfig{
					Type:        graphql.NewNonNull(taskInputObject),
					Description: "Task fields to update",
				},
			},
			Resolve: func(p graphql.ResolveParams) (interface{}, error) {
				datestr := p.Args["date"].(string)
				date, err := time.Parse(DateFormat, datestr)

				if err != nil {
					return nil, err
				}

				name := p.Args["name"].(string)

				task := Task{
					Name:  name,
					Scope: ScopeDay,
					Date:  date,
				}

				inputTask := p.Args["task"].(map[string]interface{})

				// fmt.Printf("Update task for minutes %d\n", minutes)
				//fmt.Printf("%+v\n", p.Args["task"].(map[string]interface{})["Minutes"])

				DB.Where("strftime('%Y-%m-%d', date) = ? and name = ? and scope = ?", datestr, name, ScopeDay).FirstOrCreate(&task)

				if val, ok := inputTask["Minutes"]; ok {
					task.Minutes = val.(int)
				}

				if val, ok := inputTask["MinutesDelta"]; ok {
					task.Minutes += val.(int)
				}

				DB.Save(&task)

				return task, nil
			},
		},

		"addTasks": &graphql.Field{
			Type: graphql.Boolean,
			Args: graphql.FieldConfigArgument{
				"date": &graphql.ArgumentConfig{
					Description: "Task date",
					Type:        graphql.NewNonNull(graphql.DateTime),
				},
				"scope": &graphql.ArgumentConfig{
					Description: "Task scope",
					Type:        graphql.NewNonNull(graphql.Int),
				},
				"names": &graphql.ArgumentConfig{
					Description: "Task names",
					Type:        graphql.NewList(graphql.NewNonNull(graphql.String)),
				},
			},
			Resolve: func(p graphql.ResolveParams) (interface{}, error) {
				datestr, _ := p.Args["date"].(string)
				fmt.Printf("DATE %s\n", datestr)
				date, _ := time.Parse("2006-01-02T15:04:05-07:00", datestr)
				// date := graphql.DateTime.ParseValue(datestr)

				scope, _ := p.Args["scope"].(int)

				names, _ := p.Args["names"].([]interface{})

				// TODO handle reordering

				tx := DB.Begin()

				var task Task

				for i, n := range names {
					fmt.Printf("Adding task %s %d\n", n, i)
					task = Task{
						Name:     fmt.Sprintf("%s", n),
						Date:     date,
						Scope:    scope,
						Position: i,
					}
					tx.Create(&task)
					task.Sync(false, true, true)
				}

				tx.Commit()

				return true, nil
			},
		},
	},
})

func executeVarQuery(query string, vars map[string]interface{}) *graphql.Result {
	result := graphql.Do(graphql.Params{
		Schema:         schema,
		RequestString:  query,
		VariableValues: vars,
	})
	if len(result.Errors) > 0 {
		fmt.Printf("wrong result, unexpected errors: %v", result.Errors)
	}
	return result
}

func executeQuery(query string) *graphql.Result {
	return executeVarQuery(query, nil)
}

// GraphQL schema object
var schema graphql.Schema
var graphqlinitialized = false

func graphqlInitialize() {
	if graphqlinitialized == false {
		fmt.Printf("GraphQL Schema initialized\n")
		schema, _ = graphql.NewSchema(graphql.SchemaConfig{
			Query:    queryType,
			Mutation: mutationType,
		})
		graphqlinitialized = true
	}
}

func graphqlWebInit(m *macaron.Macaron) {
	graphqlInitialize()

	type Query struct {
		Query     string                 `json:"query"`
		Variables map[string]interface{} `json:"variables"`
	}

	m.Post("/graphql", func(c *macaron.Context) {

		var body map[string]interface{}

		bodybytes, _ := c.Req.Body().Bytes()
		_ = json.Unmarshal(bodybytes, &body)

		var result *graphql.Result

		if vars, ok := body["variables"]; ok {
			result = executeVarQuery(body["query"].(string), vars.(map[string]interface{}))
		} else {
			result = executeVarQuery(body["query"].(string), nil)

		}

		// fmt.Printf("%+v\n", body)
		// result := executeVarQuery(q.Query, q.Variables, schema)

		c.JSON(http.StatusOK, result)
	})
}
