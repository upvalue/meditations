package backend

import (
	"fmt"
	"net/http"
	"time"

	"github.com/go-macaron/binding"
	"github.com/graphql-go/graphql"
	macaron "gopkg.in/macaron.v1"
)

func graphqlInit(m *macaron.Macaron) {

	/*
			statusEnum := graphql.NewEnum(graphql.EnumConfig{
				Name:        "Status",
				Description: "Status of the task: unset/complete/incomplete",
				Values: graphql.EnumValueConfigMap{
					"UNSET": &graphql.EnumValueConfig{
						Value:       TaskUnset,
						Description: "Task status is unset",
					},
					"COMPLETE": &graphql.EnumValueConfig{
						Value:       TaskComplete,
						Description: "Task status is complete",
					},
					"INCOMPLETE": &graphql.EnumValueConfig{
						Value:       TaskIncomplete,
						Description: "Task status is incomplete",
					},
				},
		  })
	*/

	commentInterface := graphql.NewObject(graphql.ObjectConfig{
		Name:        "Comment",
		Description: "Comment",
		Fields: graphql.Fields{
			"Body": &graphql.Field{
				Type:        graphql.NewNonNull(graphql.String),
				Description: "Body",
			},
		},
	})

	taskInterface := graphql.NewObject(graphql.ObjectConfig{
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
				Type:        graphql.NewNonNull(commentInterface),
				Description: "Task comment",
			},
		},
	})

	dateScopeReturn := graphql.NewObject(graphql.ObjectConfig{
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

	dateScopeEnum := graphql.NewEnum(graphql.EnumConfig{
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

	queryType := graphql.NewObject(graphql.ObjectConfig{
		Name: "Query",
		Fields: graphql.Fields{
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
					DB.Where("id = ?", p.Args["id"]).Preload("Comment").First(&task)

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
						} else if scopei == ScopeYear {
							tasksInScope(&tasksByDate.Year, ScopeYear, date)
						} else if scopei == ScopeDay {
							begin, end := _between(date, ScopeMonth)

							DB.
								Where("date BETWEEN ? and ? and scope = ?", begin, end, ScopeDay).Order("`order` asc, date asc").
								Preload("Comment").Find(&tasksByDate.Days)
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

	_ = graphql.NewObject(graphql.ObjectConfig{
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

	mutationType := graphql.NewObject(graphql.ObjectConfig{
		Name: "Mutation",
		Fields: graphql.Fields{
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
							Name:  fmt.Sprintf("%s", n),
							Date:  date,
							Scope: scope,
							Order: i,
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

	schema, _ := graphql.NewSchema(graphql.SchemaConfig{
		Query:    queryType,
		Mutation: mutationType,
	})

	executeQuery := func(query string, schema graphql.Schema) *graphql.Result {
		result := graphql.Do(graphql.Params{
			Schema:        schema,
			RequestString: query,
		})
		if len(result.Errors) > 0 {
			fmt.Printf("wrong result, unexpected errors: %v", result.Errors)
		}
		return result
	}

	type Query struct {
		Query string `json:"query"`
	}

	m.Post("/graphql", binding.Bind(Query{}), func(c *macaron.Context, q Query) {
		result := executeQuery(q.Query, schema)

		c.JSON(http.StatusOK, result)
	})
}
