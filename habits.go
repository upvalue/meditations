// habits.go - habits todo list functionality
package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"math"
	"net/http"
	"os/exec"
	"strconv"
	"strings"
	"time"

	"github.com/go-macaron/binding"
	"github.com/jinzhu/gorm"
	"github.com/jinzhu/now"

	"gopkg.in/macaron.v1"
)

var habitSync *SyncPage = MakeSyncPage("habits")

const (
	// Date format used in database
	DateFormat = "2006-01-02"
)

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
	Date time.Time `json:"date"`
	// The status of the task: complete, incomplete, or unset
	Status int `json:"status" form:"status"`
	// The scope of the task (monthly, yearly, daily)
	Scope int `json:"scope" form:"scope"`
	// The task's position within that scope
	Order int `json:"order" form:"order"`
	// Comment
	Comment Comment `json:"comment"`
	// Time stats (these may be set directly by the user or derived from lower scopes)
	Hours   int `json:"hours"`
	Minutes int `json:"minutes"`
	// Derived statistics
	CompletionRate     float64 `json:"completion_rate" sql:"-"`
	CompletedTasks     int     `json:"completed_tasks" sql:"-"`
	TotalTasks         int     `json:"total_tasks" sql:"-"`
	TotalTasksWithTime int     `json:"total_tasks_with_time" sql:"-"`
	BestStreak         int     `json:"best_streak" sql:"-"`
	Streak             int     `json:"streak" sql:"-"`
}

// Time-based scopes are built-in, but the user can add non-timed scopes to use as lists
type Scope struct {
	gorm.Model
	Name     string `sql:"not null;unique"`
	Selected bool   `sql:"-"`
}

type Comment struct {
	gorm.Model
	Body   string `json:"body"`
	TaskID int    `json:"task_id"`
}

///// Synchronization

// A message that will be sent to connected clients
type syncMessage struct {
	// true if the whole scope needs to be refreshed due to e.g. reordering, deletion or insertion
	Wholescope bool `json:"wholescope"`
	Task       Task `json:"task"`
}

// If a stat is monthly or yearly, recalculate streak and completion rate as well
func syncStats(t Task, scope int) {
	from, to := between(t.Date, scope)
	var task Task
	DB.Where("name = ? and date between ? and ? and scope = ?", t.Name, from, to, scope).Preload("Comment").First(&task)
	task.CalculateStats()
	syncTask(task, false)
}

func syncTask(t Task, scope bool) {
	if t.ID == 0 {
		return
	}

	DB.Where("task_id = ?", t.ID).First(&t.Comment)

	if t.Scope == ScopeMonth || t.Scope == ScopeYear {
		t.CalculateTimeAndCompletion()
		if t.Scope == ScopeYear {
			t.CalculateStreak()
		}
	}
	message := syncMessage{
		Wholescope: scope,
		Task:       t,
	}
	json, err := json.Marshal(message)
	checkErr(err)
	habitSync.Sync(json)
	// Recalculate stats for higher scopes
	if t.Scope == ScopeDay {
		syncStats(t, ScopeMonth)
		syncStats(t, ScopeYear)
	}
}

// Given a task's date and scope, return a range of dates that will get all tasks within the scope
func _between(start time.Time, scope int) (time.Time, time.Time) {
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

// Return a properly formatted string for sqlite (no timezone or time data included)
func between(start time.Time, scope int) (string, string) {
	from, to := _between(start, scope)
	return from.Format(DateFormat), to.Format(DateFormat)
}

func tasksInScope(tasks *[]Task, scope int, start time.Time) {
	if scope > ScopeYear {
		DB.Where("scope = ?", scope).Preload("Comment").Find(tasks)
	} else {
		from, to := between(start, scope)

		DB.Where("date BETWEEN ? and ? and scope = ?", from, to, scope).Order("`order` asc").
			Preload("Comment").Find(tasks)
	}
}

// Find TASKS in the same scope as TASK
func (task *Task) Near(tasks *[]Task) {
	tasksInScope(tasks, task.Scope, task.Date)
}

// Given a yearly task, calculate a streak of days
func (task *Task) CalculateStreak() {
	var tasks []Task
	best_streak, streak := 0, 0

	from, to := between(task.Date, task.Scope)

	DB.Where("date BETWEEN ? and ? and scope = ? and name = ?", from, to, ScopeDay, task.Name).Order("date", true).Find(&tasks)

	for _, t := range tasks {
		if t.Status == TaskComplete {
			streak++
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

	task.Streak = streak
	task.BestStreak = best_streak
}

// Given a yearly or monthly task, calculate the completion rate of all tasks in daily scopes with the same name, and
// calculate the amount of time spent on a task
func (task *Task) CalculateTimeAndCompletion() {
	var tasks []Task
	var completed, total, total_with_time, rate float64
	var hours, minutes int

	from, to := between(task.Date, task.Scope)

	// Complex queries: we sum the hours and minutes of all tasks, count all tasks, and finally count all completed tasks
	rows, err := DB.Table("tasks").Select("count(*), sum(hours), sum(minutes)").Where("date between ? and ? and scope = ? and name = ? and deleted_at is null", from, to, ScopeDay, task.Name).Rows()

	DB.Model(&task).Where("date between ? and ? and scope = ? and name = ? and status = ? and deleted_at is null", from, to, ScopeDay, task.Name, TaskComplete).Find(&tasks).Count(&completed)
	//DB.Model(&task).Where("date between ? and ? and scope = ? and name = ? and deleted_at is null", from, to, ScopeDay, task.Name).Find(&tasks).Count(&total)

	if err == nil {
		defer rows.Close()
		for rows.Next() {
			rows.Scan(&total, &hours, &minutes)
		}
	}

	rows, err = DB.Table("tasks").Select("count(*)").Where("date between ? and ? and scope = ? and name = ? and (hours is not null or minutes is not null) and deleted_at is null",
		from, to, ScopeDay, task.Name).Rows()

	if err == nil {
		defer rows.Close()
		for rows.Next() {
			rows.Scan(&total_with_time)
		}
	}

	// Calculate time by converting minutes to hours and accounting for overflow
	hours += (minutes / 60)
	minutes = minutes % 60

	// Calculate completion rate
	if total == 0.0 {
		rate = -1.0
	} else if completed == total {
		rate = 100.0
	} else {
		rate = math.Floor((completed * 100.0) / total)
	}

	task.Hours, task.Minutes, task.CompletedTasks, task.TotalTasks, task.TotalTasksWithTime, task.CompletionRate = hours, minutes,
		int(completed), int(total), int(total_with_time), rate
}

func (task *Task) CalculateStats() {
	task.CalculateTimeAndCompletion()
	task.CalculateStreak()
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

// Fetch tasks in a given scope and date range, return JSON
func tasksInScopeR(c *macaron.Context, scope int) {
	var tasks []Task
	date, err := time.Parse(DateFormat, c.Query("date"))
	if err != nil {
		serverError(c, "error parsing date %s", c.Query("date"))
		return
	}
	// Calculate completion rates
	tasksInScope(&tasks, scope, date)
	if scope == ScopeMonth {
		for i, _ := range tasks {
			tasks[i].CalculateTimeAndCompletion()
		}
	} else if scope == ScopeYear {
		// Calculate all statistics
		for i, _ := range tasks {
			tasks[i].CalculateStats()
		}
	}

	c.JSON(http.StatusOK, tasks)
}

func tasksInDays(c *macaron.Context) {
	type Result struct {
		Date  string
		Tasks []Task
	}
	var results []Result
	date, err := time.Parse(DateFormat, c.Query("date"))
	finish := now.New(date).EndOfMonth().AddDate(0, 0, 1)
	if err != nil {
		serverError(c, "error parsing date %s", c.Query("date"))
		return
	}
	limit, err := strconv.ParseInt(c.Query("limit"), 10, 32)
	if err != nil {
		serverError(c, "error parsing limit int %s", c.Query("limit"))
	}
	date = now.New(date).BeginningOfMonth()
	for date.Month() != finish.Month() {
		var tasks []Task
		tasksInScope(&tasks, ScopeDay, date)
		results = append(results, Result{date.Format(DateFormat), tasks})
		date = date.AddDate(0, 0, 1)
		if date.Day() == int(limit) {
			break
		}
	}

	c.JSON(200, results)
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

// Return all tasks in date range
func visualizeRange(c *macaron.Context) {

	begin, err := time.Parse(DateFormat, c.Query("begin"))
	if err != nil {
		serverError(c, "error parsing date %s", c.Query("begin"))
		return
	}

	end, err := time.Parse(DateFormat, c.Query("end"))
	if err != nil {
		serverError(c, "error parsing date %s", c.Query("end"))
		return
	}

	/*
		id := now.New(begin)
		endd := now.New(end)
	*/

	var tasks []Task
	DB.Table("tasks").Select("distinct name").Where("date between ? and ? and scope = ?", begin, end, ScopeDay).Find(&tasks)

	var repeated_tasks []Task
	for _, t := range tasks {
		var t2 Task
		res := DB.Table("tasks").Select("*").Group("name").Where("(date between ? and ?) and scope = ? and name = ?", begin, end, ScopeDay,
			t.Name).Having("COUNT(name) > 5").First(&t2)

		if res.RowsAffected > 0 {
			repeated_tasks = append(repeated_tasks, t2)
		}
	}

	for _, t := range repeated_tasks {
		fmt.Printf("%v\n", t.Name)
	}

	/*
		type Result struct {
			Date  string
			Tasks []Task
		}

		var results []Result

		for !id.Equal(endd.Time) {
			var result Result
			result.Date = id.Format(DateFormat)
			tasksInScope(&result.Tasks, ScopeDay, id.Time)
			results = append(results, result)
			//fmt.Printf("%v\n", id)
			id.Time = id.AddDate(0, 0, 1)
		}

		c.JSON(200, results)
	*/
	c.PlainText(200, []byte("{}"))
}

// Update a task's fields by JSON
func taskUpdate(c *macaron.Context, task Task) {
	DB.Where("id = ?", c.Params("id")).First(&task)
	DB.Save(&task)
	//DB.Where("task_id = ?", task.ID).First(&task.Comment)
	syncTask(task, false)
	c.JSON(200, task)
}

func taskNew(c *macaron.Context, task Task) {
	var tasks []Task

	tasksInScope(&tasks, task.Scope, task.Date)
	task.Order = len(tasks)
	DB.Save(&task)
	if task.Scope > ScopeYear {
		var scope Scope
		DB.Where("id = ?", task.Scope).First(&scope)
		scope.UpdatedAt = time.Now()
		DB.Save(&scope)
	}
	syncTask(task, true)
	c.PlainText(http.StatusOK, []byte("OK"))
}

func taskDelete(c *macaron.Context, task Task) {
	var comment Comment
	var tasks []Task

	DB.Where("id = ?", c.Params("id")).First(&task)

	task.Near(&tasks)

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
		// Empty, do not create or update comment
	} else if cid > 0 && empty == true {
		// Delete existing comment
		DB.Delete(&comment)
	} else {
		if cid == 0 {
			// Update existing comment
			var test Comment
			DB.Where("task_id = ?", comment.TaskID).First(&test)
			if test.ID > 0 {
				comment.ID = test.ID
			}
		}
		// Create or update comment
		DB.Save(&comment)
		task.Comment = comment
	}
	syncTask(task, false)
	c.PlainText(200, []byte("OK"))
}

// Return list of all buckets by most recent
func buckets(c *macaron.Context) {
	var scopes []Scope
	DB.Where("id > ?", ScopeYear).Order("updated_at desc").Find(&scopes)

	c.JSON(200, scopes)
}

func bucketNew(c *macaron.Context) {
	var scope Scope
	scope.Name = c.Params("name")
	DB.Save(&scope)
	c.JSON(200, scope)
}

// Export a summary of tasks in human readable format (e.g. to give an exercise or diet log to your trainer)
func export(c *macaron.Context) {
	var buffer bytes.Buffer
	var scopes []string

	name := c.Req.PostFormValue("name")
	before := c.Req.PostFormValue("export_before_date")
	after := c.Req.PostFormValue("export_after_date")

	if c.Req.PostFormValue("day") == "day" {
		scopes = append(scopes, fmt.Sprintf("%d", ScopeDay))
	}

	if c.Req.PostFormValue("month") == "month" {
		scopes = append(scopes, fmt.Sprintf("%d", ScopeMonth))
	}

	if c.Req.PostFormValue("year") == "year" {
		scopes = append(scopes, fmt.Sprintf("%d", ScopeYear))
	}

	if before == "" {
		before = time.Date(1990, time.January, 1, 0, 0, 0, 0, time.Local).Format(DateFormat)
	}

	if after == "" {
		after = time.Now().AddDate(0, 0, 1).Format(DateFormat)
	}

	statusp := false
	if c.Req.PostFormValue("status") == "status" {
		statusp = true
	}

	// Construct query
	var tasks []Task
	name = fmt.Sprintf("%%%s%%", name)
	query := "name like ? and scope in (?) and date > date(?) and date < date(?)"
	DB.Where(query, name, scopes, before, after).Order("date desc").Find(&tasks)

	for _, t := range tasks {
		// These cannot be preloaded because there may be a ridiculous amount of them
		// TODO: Terribly slow
		DB.Preload("Comment").Find(&t)
		datefmt := DateFormat
		if t.Scope == ScopeYear {
			datefmt = "2006"
		} else if t.Scope == ScopeMonth {
			datefmt = "2006-01"
		}
		var status string
		if statusp == true {
			if t.Status == TaskComplete {
				status = "COMPLETE"
			} else if t.Status == TaskIncomplete {
				status = "INCOMPLETE"
			} else {
				status = "UNSET"
			}
		} else {
			status = ""
		}
		buffer.WriteString(fmt.Sprintf("%s %s %s\n", t.Date.Format(datefmt), status, t.Comment.Body))
	}

	// TODO: Remove unsightly <br> backslashes
	// Convert HTML to markdown for plaintext readability
	process := exec.Command("pandoc", "-f", "html", "-t", "markdown")
	var out bytes.Buffer
	process.Stdin = strings.NewReader(buffer.String())
	process.Stdout = &out
	err := process.Run()
	if err != nil {
		c.PlainText(200, buffer.Bytes())
		return
	} else {
		c.PlainText(200, out.Bytes())
	}
}

// Places an array in c.Data showing which years have data available
func getYears(c *macaron.Context) {
	var first, first_this_year, last Task

	type Link struct {
		Href string
		Text string
	}

	var year_links []Link

	err := DB.Where("scope = ?", ScopeDay).Order("date asc").Limit(1).First(&first).Error
	DB.Where("scope = ?", ScopeDay).Order("date desc").Limit(1).First(&last)
	DB.Where("scope = ? and date > ?", ScopeDay, now.New(last.CreatedAt).BeginningOfYear()).First(&first_this_year)

	if err == nil {
		for d := first.CreatedAt; d.Year() != last.CreatedAt.Year()+1; d = d.AddDate(1, 0, 0) {
			year_links = append(year_links, Link{Href: d.Format("2006"), Text: d.Format("06")})
			fmt.Printf("%s\n", d.Format("06"))
		}

	}

	c.Data["HabitYearLinks"] = year_links
}

func habitsIndex(c *macaron.Context) {
	c.Data["Page"] = "habits"

	getYears(c)

	c.HTML(200, "habits")
}

func habitsVisualization(c *macaron.Context) {
	c.Data["page"] = "habits-visualize"

	getYears(c)

	c.HTML(200, "habits-visualize")
}

func habitsInit(m *macaron.Macaron) {
	m.Get("/", habitsIndex)

	m.Get("/visualize", habitsVisualization)
	m.Get("/visualize/range", visualizeRange)

	m.Get("/in-year", tasksInYear)
	m.Get("/in-month", tasksInMonth)
	m.Get("/in-day", tasksInDay)
	m.Get("/in-days", tasksInDays)

	m.Get("/in-bucket/:id([0-9]+)", tasksInBucket)
	m.Get("/buckets", buckets)

	m.Post("/update", binding.Bind(Task{}), taskUpdate)
	m.Post("/new", binding.Bind(Task{}), taskNew)
	m.Post("/delete", binding.Bind(Task{}), taskDelete)
	m.Post("/order-up", binding.Bind(Task{}), taskOrderUp)
	m.Post("/order-down", binding.Bind(Task{}), taskOrderDown)
	m.Post("/comment-update", binding.Bind(Comment{}), commentUpdate)
	m.Post("/bucket-new/:name", bucketNew)
	m.Post("/export", export)

	m.Get("/sync", habitSync.Handler())
}
