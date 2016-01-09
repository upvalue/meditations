// tasks.go - habits todo list functionality
package main

import (
	"math"
	"net/http"
	"time"

	"github.com/jinzhu/now"
	"github.com/macaron-gonic/macaron"

	"gopkg.in/macaron.v1"
)

const (
	// Scope for daily tasks and comments
	ScopeDay = iota
	// Scope for monthly tasks and comments
	ScopeMonth = iota
	// Scope for yearly tasks and comments
	ScopeYear = iota
	// Scope for comments that belong to a specific task
	ScopeUnset = iota
	// Scope for "bucket list" tasks and comments
	ScopeBucket = iota
)

const (
	// Default task status
	TaskUnset = iota
	// Set when a task is completed successfully
	TaskComplete = iota
	// Set when a task is not completed successfully
	TaskIncomplete = iota
)

type Task struct {
	ID             int         `sql:"AUTO_INCREMENT" json:"id"`
	Name           string      `json:"name" form:"name"`
	CreatedAt      time.Time   `json:"created_at"`
	Status         int         `json:"status" form:"status"`
	Scope          int         `json:"scope" form:"scope"`
	Order          int         `json:"order" form:"order"`
	Comment        TaskComment `json:"comment"`
	CompletionRate float64     `json:"completion_rate" sql:"-"`
}

type TaskComment struct {
	ID        int       `sql:"AUTO_INCREMENT" json:"id"`
	Body      string    `json:"body"`
	CreatedAt time.Time `json:"created_at"`
	// Comments can be either under a scope (e.g. a given day or month) or under a specific task
	Scope  int `json:"scope"`
	TaskID int `json:"task_id"`
}

// Given a task's date and scope, return a range of dates that will get all tasks within the scope
func between(start time.Time, scope int, from *time.Time, to *time.Time) {
	switch scope {
	case ScopeDay:
		*from = now.New(start).BemacaronningOfDay()
		*to = (*from).AddDate(0, 0, 1)
	case ScopeMonth:
		*from = now.New(start).BemacaronningOfMonth()
		*to = (*from).AddDate(0, 1, 0)
	case ScopeYear:
		*from = now.New(start).BemacaronningOfYear()
		*to = (*from).AddDate(1, 0, 0)
	case ScopeBucket:
		*from = time.Date(2000, 0, 0, 0, 0, 0, 0, time.Now().Location())
		*to = time.Now()
	}
}

func tasksInScope(tasks *[]Task, scope int, start time.Time) {
	var from, to time.Time

	if scope == ScopeBucket {
		DB.Where("scope = ?", ScopeBucket).Preload("Comment").Find(tasks)
	} else {
		between(start, scope, &from, &to)

		DB.Where("created_at BETWEEN ? and ? and scope = ?", from.Format("2006-01-02"), to.Format("2006-01-02"), scope).Order("`order` asc").
			Preload("Comment").Find(tasks)
	}
}

// Find TASKS in the same scope as TASK
func tasksNear(task Task, tasks *[]Task) {
	tasksInScope(tasks, task.Scope, task.CreatedAt)
}

// Given a yearly or monthly task, calculate the completion rate of all tasks in daily scopes with the same name
func completionRate(task Task) float64 {
	var from, to time.Time
	var tasks []Task

	between(task.CreatedAt, task.Scope, &from, &to)

	DB.Where("created_at BETWEEN ? and ? and scope = 0 and name = ?", from.Format("2006-01-02"),
		to.Format("2006-01-02"), task.Name).Find(&tasks)

	count := float64(len(tasks))

	rate := 0.0
	for _, t := range tasks {
		if t.Status == TaskComplete {
			rate += 1.0
		}
	}

	//fmt.Printf("Completion rate %f %f\n", count, rate)
	if count == 0.0 {
		return -1.0
	} else {
		return math.Floor((rate * 100.0) / count)
	}
}

// Given a
func tasksInScopeR(c *macaron.Context, scope int) {
	var tasks []Task
	date, err := time.Parse("2006-01-02", c.Query("date"))
	if err == nil {
		// Calculate completion rates
		tasksInScope(&tasks, scope, date)
		if scope == ScopeMonth || scope == ScopeYear {
			for i, t := range tasks {
				tasks[i].CompletionRate = completionRate(t)
			}
		}

		c.JSON(http.StatusOK, tasks)
	} else {
		serverError(c, "error parsing date %s", c.Query("date"))
	}
}

func tasksInBucket(c *macaron.Context) {
	var tasks []Task
	DB.Where("scope = 3").Order("`order` asc").Preload("Comment").Find(&tasks)
	c.JSON(http.StatusOK, tasks)
}

func tasksInDay(c *macaron.Context) {
	tasksInScopeR(c, ScopeDay)
}

func tasksInMonth(c *macaron.Context) {
	tasksInScopeR(c, ScopeMonth)
}

func tasksInYear(c *macaron.Context) {
	tasksInScopeR(c, ScopeYear)
}

func habitsInit(m *macaron.Macaron) {
	m.Get("/", func(c *macaron.Context) {
		c.HTML(200, "habits")
	})
}
