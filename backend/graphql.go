package backend

import (
	"fmt"
	"net/http"

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
		},
	})

	schema, _ := graphql.NewSchema(graphql.SchemaConfig{
		Query: queryType,
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
