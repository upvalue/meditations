// tasks.go - habits todo list functionality
package main

import (
	"encoding/json"
	"log"
	"math"
	"net/http"
	"time"

	"github.com/go-macaron/binding"
	"github.com/jinzhu/gorm"
	"github.com/jinzhu/now"

	"gopkg.in/macaron.v1"
)

var habitSync *SyncPage

const (
	// Scope for "bucket list" tasks and comments
	ScopeBucket = iota
	// Scope for daily tasks and journal entries
	ScopeDay = iota
	// Scope for monthly tasks
	ScopeMonth = iota
	// Scope for yearly tasks
	ScopeYear = iota
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
	gorm.Model
	Name string `json:"name" form:"name"`
	// The actual date of the task, regardless of when it was created
	Date    time.Time `json:"date"`
	Status  int       `json:"status" form:"status"`
	Scope   int       `json:"scope" form:"scope"`
	Order   int       `json:"order" form:"order"`
	Comment Comment   `json:"comment"`
	// Statistics
	CompletionRate float64 `json:"completion_rate" sql:"-"`
	CompletedTasks int     `json:"completed_tasks" sql:"-"`
	TotalTasks     int     `json:"total_tasks" sql:"-"`
	BestStreak     int     `json:"best_streak" sql:"-"`
	Streak         int     `json:"streak" sql:"-"`
	Hours          int     `json:"hours"`
	Minutes        int     `json:"minutes"`
}

type Scope struct {
	gorm.Model
	Name string `sql:"not null;unique"`
}

type Comment struct {
	gorm.Model
	Body   string `json:"body"`
	TaskID int    `json:"task_id"`
}

///// Synchronization

type syncMessage struct {
	// true if the whole scope needs to be refreshed due to e.g. reordering, deletion or insertion
	Wholescope bool `json:"wholescope"`
	Task       Task `json:"task"`
}

// If a stat is monthly or yearly, recalculate streak and completion rate as well
func syncStats(t Task, scope int) {
	from, to := between(t.Date, scope)
	var task Task
	DB.Where("name = ? and date between ? and ? and scope = ?", t.Name, from, to, scope).First(&task)
	task.CompletionRate = calculateCompletionRate(task)
	task.Streak, task.BestStreak = calculateStreak(task)
	task.CompletedTasks, task.TotalTasks, task.Hours, task.Minutes = calculateTime(task)
	syncTask(task, false)
}

func syncTask(t Task, scope bool) {
	message := syncMessage{
		Wholescope: scope,
		Task:       t,
	}
	json, err := json.Marshal(message)
	checkErr(err)
	habitSync.Sync(json)
	if t.Scope == ScopeDay {
		syncStats(t, ScopeMonth)
		syncStats(t, ScopeYear)
	}
}

// Given a task's date and scope, return a range of dates that will get all tasks within the scope
func between(start time.Time, scope int) (time.Time, time.Time) {
	switch scope {
	case ScopeDay:
		from := now.New(start).BeginningOfDay()
		return from, from.AddDate(0, 0, 1)
	case ScopeMonth:
		from := now.New(start).BeginningOfMonth()
		return from, from.AddDate(0, 1, 0)
	case ScopeYear:
		from := now.New(start).BeginningOfYear()
		return from, from.AddDate(1, 0, 0)
	case ScopeBucket:
	}
	if scope > ScopeYear {
		return time.Date(1960, 1, 1, 0, 0, 0, 0, time.Local), time.Now()
	}
	return time.Now(), time.Now()
}

func tasksInScope(tasks *[]Task, scope int, start time.Time) {
	if scope > ScopeYear {
		DB.Where("scope = ?", scope).Preload("Comment").Find(tasks)
	} else {
		from, to := between(start, scope)

		DB.Where("date BETWEEN ? and ? and scope = ?", from.Format("2006-01-02"), to.Format("2006-01-02"), scope).Order("`order` asc").
			Preload("Comment").Find(tasks)
	}
}

// Find TASKS in the same scope as TASK
func tasksNear(task Task, tasks *[]Task) {
	tasksInScope(tasks, task.Scope, task.Date)
}

// Given a yearly or monthly task, calculate the completion rate of all tasks in daily scopes with the same name
func calculateCompletionRate(task Task) float64 {
	var tasks []Task

	from, to := between(task.Date, task.Scope)

	DB.Where("date BETWEEN ? and ? and scope = ? and name = ?", from.Format("2006-01-02"), to.Format("2006-01-02"), ScopeDay, task.Name).Find(&tasks)

	count := float64(len(tasks))

	rate := 0.0
	for _, t := range tasks {
		if t.Status == TaskComplete {
			rate += 1.0
		} else if t.Status == TaskUnset {
			// Do not include unset tasks in the total
			count -= 1.0
		}
	}

	//fmt.Printf("Completion rate %f %f\n", count, rate)
	if count == 0.0 {
		return -1.0
	} else {
		return math.Floor((rate * 100.0) / count)
	}
}

// Given a yearly task, calculate a streak of days
func calculateStreak(task Task) (int, int) {
	var tasks []Task
	best_streak, streak := 0, 0

	from, to := between(task.Date, task.Scope)

	DB.Where("date BETWEEN ? and ? and scope = ? and name = ?", from, to, ScopeDay, task.Name).Order("date", true).Find(&tasks)

	for _, t := range tasks {
		if t.Status == TaskComplete {
			streak += 1
		} else if t.Status == TaskIncomplete {
			if streak > best_streak {
				best_streak = streak
			}
			streak = 0
		}
		// Skip unset tasks so that today's uncompleted tasks do not change the streak
	}

	if streak > best_streak {
		best_streak = streak
	}

	return streak, best_streak
}

func calculateTime(task Task) (int, int, int, int) {
	var tasks []Task

	from, to := between(task.Date, task.Scope)

	DB.Where("date BETWEEN ? and ? and scope = ? and name = ?", from.Format("2006-01-02"), to.Format("2006-01-02"), ScopeDay, task.Name).Find(&tasks)

	completed, total, hours, minutes := 0, 0, 0, 0

	for _, t := range tasks {
		hours += t.Hours
		minutes += t.Minutes
		if t.Status == TaskComplete {
			completed += 1
		}
		total += 1
	}

	for minutes > 60 {
		minutes -= 60
		hours += 1
	}

	return completed, total, hours, minutes
}

func tasksInScopeR(c *macaron.Context, scope int) {
	var tasks []Task
	date, err := time.Parse("2006-01-02", c.Query("date"))
	if err != nil {
		serverError(c, "error parsing date %s", c.Query("date"))
		return
	}
	// Calculate completion rates
	tasksInScope(&tasks, scope, date)
	if scope == ScopeMonth || scope == ScopeYear {
		for i, t := range tasks {
			tasks[i].CompletionRate = calculateCompletionRate(t)
			tasks[i].CompletedTasks, tasks[i].TotalTasks, tasks[i].Hours, tasks[i].Minutes = calculateTime(t)
		}
	}
	if scope == ScopeYear {
		for i, t := range tasks {
			tasks[i].Streak, tasks[i].BestStreak = calculateStreak(t)
		}
	}

	c.JSON(http.StatusOK, tasks)
}

func tasksInBucket(c *macaron.Context) {
	var scope Scope
	scope.ID = uint(c.ParamsInt(":id"))
	if scope.ID == 0 {
		DB.Order("updated_at desc").First(&scope)
	} else {
		DB.First(&scope)
	}

	var tasks []Task
	DB.Where("scope = ?", scope.ID).Order("`order` asc").Preload("Comment").Find(&tasks)
	c.JSON(http.StatusOK, map[string]interface{}{
		"scope": scope,
		"tasks": tasks,
	})
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

// Update a task's fields by JSON
func taskUpdate(c *macaron.Context, task Task) {
	log.Printf("TASK UPDATE %+v\n", task)
	DB.Where("id = ?", c.Params("id")).First(&task)
	DB.Save(&task)
	syncTask(task, false)
	c.JSON(200, task)
}

func taskNew(c *macaron.Context, task Task) {
	var tasks []Task

	tasksInScope(&tasks, task.Scope, task.Date)
	task.Order = len(tasks)
	DB.Save(&task)
	syncTask(task, true)
	c.PlainText(http.StatusOK, []byte("OK"))
}

func taskDelete(c *macaron.Context, task Task) {
	var comment Comment
	var tasks []Task

	DB.Where("id = ?", c.Params("id")).First(&task)

	tasksNear(task, &tasks)

	log.Printf("%+v", task)

	DB.Delete(&task)
	if task.Comment.ID > 0 {
		DB.Where("task_id = ?", task.ID).First(&comment).Delete(&comment)
	}

	syncTask(task, true)

	// Reorder tasks after this one
	for _, t := range tasks {
		if t.Order > task.Order {
			t.Order = t.Order - 1
		}
		DB.Save(&t)
	}

	c.PlainText(http.StatusOK, []byte("OK"))
}

// Change task ordering within scope
func taskSwapOrder(c *macaron.Context, change int, task Task) {
	DB.Where("id = ?", task.ID).First(&task)
	log.Printf("%d %+v", change, task)

	if (change == -1 && task.Order > 0) || change == 1 {
		var swap Task

		from, to := between(task.Date, task.Scope)

		DB.Where("date between ? and ? and scope = ? and `order` = ?", from, to, task.Scope, task.Order+change).First(&swap)

		// If there is something to swap it with
		if swap.ID > 0 {
			b := swap.Order
			swap.Order = task.Order
			task.Order = b
			DB.Save(&swap).Save(&task)
		}
	}

	syncTask(task, true)
	c.PlainText(http.StatusOK, []byte("OK"))
}

// Move task up in order within scope
func taskOrderUp(c *macaron.Context, t Task) {
	taskSwapOrder(c, -1, t)
}

// Move task down in order within scope
func taskOrderDown(c *macaron.Context, t Task) {
	taskSwapOrder(c, 1, t)
}

// Update or create a comment
func commentUpdate(c *macaron.Context, comment Comment) {
	var task Task

	cid := comment.ID
	log.Printf("%+v", comment)

	empty := (len(comment.Body) == 0 || comment.Body == "<p><br></p>")
	DB.Where("ID = ?", comment.TaskID).Find(&task)

	if cid == 0 && empty == true {
		// Empty, do not create comment
	} else if cid > 0 && empty == true {
		// Delete comment
		DB.Delete(&comment)
	} else {
		// Create or update comment
		DB.Save(&comment)
	}
	syncTask(task, false)
	c.PlainText(200, []byte("OK"))
}

// Return list of all buckets by most recent
func buckets(c *macaron.Context) {
	var scopes []Scope
	DB.Where("id > ?", ScopeYear).Find(&scopes)
	c.JSON(200, scopes)
}

func bucketNew(c *macaron.Context) {
	var scope Scope
	scope.Name = c.Params("name")
	DB.Save(&scope)
	c.JSON(200, scope)
}

func habitsInit(m *macaron.Macaron) {
	m.Get("/", func(c *macaron.Context) {
		c.HTML(200, "habits")
	})

	m.Get("/in-year", tasksInYear)
	m.Get("/in-month", tasksInMonth)
	m.Get("/in-day", tasksInDay)
	m.Get("/in-bucket/:id([0-9]+)", tasksInBucket)
	m.Get("/buckets", buckets)

	m.Post("/update", binding.Bind(Task{}), taskUpdate)
	m.Post("/new", binding.Bind(Task{}), taskNew)
	m.Post("/delete", binding.Bind(Task{}), taskDelete)
	m.Post("/order-up", binding.Bind(Task{}), taskOrderUp)
	m.Post("/order-down", binding.Bind(Task{}), taskOrderDown)
	m.Post("/comment-update", binding.Bind(Comment{}), commentUpdate)
	m.Post("/bucket-new/:name", bucketNew)

	habitSync = MakeSyncPage("habits")
	m.Get("/sync", habitSync.Handler())
}
