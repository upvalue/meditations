package backend

// habits.go - habits todo list functionality

import (
	"bytes"
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

var habitSync = MakeSyncPage("habits")

// DateFormat is the Time.Format format used in the database
const (
	// Date format used in database
	DateFormat = "2006-01-02"
)

const (
	// ScopeUnused was originally used to refer to a global "bucket list," but this has been superceded by project support.
	// No tasks should have a scope of ScopeUnused.
	ScopeUnused = iota
	// ScopeDay of daily tasks and journal entries
	ScopeDay = iota
	// ScopeMonth scope of monthly tasks
	ScopeMonth = iota
	// ScopeYear scope of yearly tasks
	ScopeYear = iota
	// ScopeProject scope of projects. Note that all scopes with this or higher are projects.
	ScopeProject = iota
)

const (
	// TaskUnset when a task's status has not been set
	TaskUnset = iota
	// TaskComplete when a task is completed successfully
	TaskComplete = iota
	// TaskIncomplete when a task is not completed successfully
	TaskIncomplete = iota
)

// Task represents a task in the database
type Task struct {
	gorm.Model
	Name string
	// The actual date of the task, regardless of when it was created
	Date time.Time
	// The status of the task: complete, incomplete, or unset
	Status int
	// The scope of the task (monthly, yearly, daily)
	Scope int
	// The task's position within that scope
	Order int
	// Comment
	Comment Comment
	// Time stats (these may be set directly by the user or derived from lower scopes)
	Hours   int
	Minutes int
	// These statistics are derived at runtime, and not represented in SQL
	CompletionRate     float64 `gorm:"-"`
	CompletedTasks     int     `gorm:"-"`
	TotalTasks         int     `gorm:"-"`
	TotalTasksWithTime int     `gorm:"-"`
	BestStreak         int     `gorm:"-"`
	Streak             int     `gorm:"-"`
}

// Scope represents a task scope. Time-based scopes (daily, monthly, yearly) are built-in, but the user can add
// additional "projects," each of which have their own scope with an ID of ScopeProject or greater
type Scope struct {
	gorm.Model
	Name     string `gorm:"not null;unique"`
	Selected bool   `gorm:"-"`
	Pinned   bool   `gorm:"not null;default:'0'"`
}

// Comment represents a task comment.
type Comment struct {
	gorm.Model
	Body   string
	TaskID int
}

//
///// TASK METHODS
//

// Near finds TASKS in the same scope as TASK
func (task *Task) Near(tasks *[]Task) {
	tasksInScope(tasks, task.Scope, task.Date)
}

// CalculateStreak Given a yearly task, calculate a streak of days
func (task *Task) CalculateStreak() {
	var tasks []Task
	bestStreak, streak := 0, 0

	from, to := between(task.Date, task.Scope)

	DB.Where("date BETWEEN ? and ? and scope = ? and name = ?", from, to, ScopeDay, task.Name).Order("date", true).Find(&tasks)

	for _, t := range tasks {
		if t.Status == TaskComplete {
			streak++
		} else if t.Status == TaskIncomplete {
			if streak > bestStreak {
				bestStreak = streak
			}
			streak = 0
		}
		// Skip unset tasks so that today's uncompleted tasks do not change the streak
	}

	if streak > bestStreak {
		bestStreak = streak
	}

	task.Streak = streak
	task.BestStreak = bestStreak
}

// CalculateTimeAndCompletion Given a yearly or monthly task, calculate the completion rate of all tasks in daily
// scopes with the same name, and calculate the amount of time spent on a task
func (task *Task) CalculateTimeAndCompletion() {
	var tasks []Task
	var completed, total, totalWithTime, rate float64
	var hours, minutes int

	from, to := between(task.Date, task.Scope)

	// Complex queries: we sum the hours and minutes of all tasks, count all tasks, and finally count all completed tasks
	rows, err := DB.Table("tasks").Select("count(*), sum(hours), sum(minutes)").Where("date between ? and ? and scope = ? and name = ? and deleted_at is null", from, to, ScopeDay, task.Name).Rows()

	DB.Model(&task).Where("date between ? and ? and scope = ? and name = ? and status = ? and deleted_at is null", from, to, ScopeDay, task.Name, TaskComplete).Find(&tasks).Count(&completed)

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
			rows.Scan(&totalWithTime)
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
		int(completed), int(total), int(totalWithTime), rate
}

// CalculateStats calculates all statistics for monthly and yearly tasks
func (task *Task) CalculateStats() {
	// TODO: Rather than calling this ad-hoc, it should be done when a task is retrieved from the database.

	// TODO: This is quite inefficient to do e.g. every time it needs to be rendered
	// It could be cached in the database, but perhaps it would be simpler to do it in
	// a data structure in memory of some kind
	if task.Scope == ScopeMonth || task.Scope == ScopeYear {
		task.CalculateTimeAndCompletion()
		if task.Scope == ScopeYear {
			task.CalculateStreak()
		}
	}
}

//
///// SYNCHRONIZATION
//

type habitSyncMsg struct {
	Tasks []Task
}

// There are several types of UI task updates
// Updates that mean the scope may need to be re-ordered (re-ordering)
// Updates that mean higher scopes and projects may need their stats re-calculated (status changes)
// Updates that only effect the task in question and do not necessitate any recalculations
// Combinations (e.g. deletion may require recalculation and reordering)

// SyncOnlyTask just sends a single task; used for comment updates only
func (task *Task) SyncOnlyTask() {
	var tasks []Task
	tasks = append(tasks, *task)

	habitSync.Send("UPDATE_TASKS", habitSyncMsg{
		Tasks: tasks,
	})

}

// SyncWithStats syncs a specific task, and recalculates tasks on higher-scoped tasks if necessary
func (task *Task) SyncWithStats(includeMainTask bool) {
	if task.ID == 0 {
		return
	}

	DB.Where("task_id = ?", task.ID).First(&task.Comment)

	var tasks []Task

	if task.Scope == ScopeDay {
		var year Task
		from, to := between(task.Date, ScopeYear)
		DB.Where("name = ? and date between ? and ? and scope = ?", task.Name, from, to, ScopeYear).Preload("Comment").First(&year)
		if year.ID != 0 {
			year.CalculateStats()
			tasks = append(tasks, year)
		}

		var month Task
		from, to = between(task.Date, ScopeMonth)
		DB.Where("name = ? and date between ? and ? and scope = ?", task.Name, from, to, ScopeMonth).Preload("Comment").First(&month)
		if month.ID != 0 {
			month.CalculateStats()
			tasks = append(tasks, month)
		}
	} else if task.Scope == ScopeYear || task.Scope == ScopeMonth {
		task.CalculateStats()
	}

	if includeMainTask == true {
		tasks = append(tasks, *task)
	}

	if len(tasks) != 0 {
		// It is possible for this to result in zero tasks to send, if a task has been deleted and
		// no stat recalculations are necessary
		habitSync.Send("UPDATE_TASKS", habitSyncMsg{
			Tasks: tasks,
		})
	}

}

type scopeSyncMsg struct {
	Date  string
	Scope int
	Tasks []Task
	Name  string
}

// SyncScope re-sends a task's entire scope. Necessary when order is changed or a task is deleted
func (task *Task) SyncScope() {
	var tasks []Task
	task.Near(&tasks)

	for i := range tasks {
		tasks[i].CalculateStats()
	}

	var scopeName string

	// If this is a project, we also need to include the name
	if task.Scope >= ScopeProject {
		var scope Scope
		DB.Where("ID = ?", task.Scope).First(&scope)

		scopeName = scope.Name
	}

	message := scopeSyncMsg{
		Date:  task.Date.Format(DateFormat),
		Scope: task.Scope,
		Tasks: tasks,
		Name:  scopeName,
	}

	habitSync.Send("UPDATE_SCOPE", message)
}

// Sync sends updates to the UI as necessary after a task changes
func (task *Task) Sync(updateScope bool, recalculate bool, includeMainTask bool) {
	if updateScope {
		task.SyncScope()
	}

	if recalculate {
		task.SyncWithStats(includeMainTask)
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
	}
	if scope > ScopeYear {
		return time.Date(1960, 1, 1, 0, 0, 0, 0, time.Local), time.Now().AddDate(0, 0, 1)
	}
	return time.Now(), time.Now()
}

// Return a properly formatted string for sqlite (no timezone or time data included)
func between(start time.Time, scope int) (string, string) {
	from, to := _between(start, scope)
	return from.Format(DateFormat), to.Format(DateFormat)
}

// tasksInScope returns all the tasks in a given scope and timeframe
func tasksInScope(tasks *[]Task, scope int, start time.Time) {
	if scope >= ScopeProject {
		DB.Where("scope = ?", scope).Preload("Comment").Order("`order` asc").Find(tasks)
	} else {
		from, to := between(start, scope)

		DB.Where("date BETWEEN ? and ? and scope = ?", from, to, scope).Order("`order` asc").
			Preload("Comment").Find(tasks)
	}
}

// tasksInProject returns all tasks in a given scope
func tasksInProject(c *macaron.Context) {
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

// tasksInScopeRequest fetches tasks with statistics in a given scope, extracting a date from a Macaron context
func tasksInScopeRequest(c *macaron.Context, scope int, tasks *[]Task) error {
	date, err := time.Parse(DateFormat, c.Query("date"))
	if err != nil {
		serverError(c, "malformed date %s", c.Query("date"))
		return err
	}
	// Calculate completion rates
	tasksInScope(tasks, scope, date)
	for i := range *tasks {
		(*tasks)[i].CalculateStats()
	}
	return nil
}

// jsonTasksInScope returns a bunch of tasks as a JSON response
func jsonTasksInScope(c *macaron.Context, scope int) {
	var tasks []Task
	if tasksInScopeRequest(c, scope, &tasks) == nil {
		c.JSON(http.StatusOK, tasks)
	}
}

// DayTasks represents a list of dates and task arrays, representing all tasks in a set of days for a month
type DayTasks struct {
	Date  string
	Tasks []Task
}

func tasksInDays(c *macaron.Context, results *[]DayTasks) error {
	date, err := time.Parse(DateFormat, c.Query("date"))
	if err != nil {
		serverError(c, "error parsing date %s", c.Query("date"))
		return err
	}

	limit := int64(0)
	// This function supports limit as an optional query variable;
	// if viewing the current month, this will not show days in the future
	if c.Query("limit") != "" {
		limit, err = strconv.ParseInt(c.Query("limit"), 10, 32)
		if err != nil {
			serverError(c, "error parsing limit int %s", c.Query("limit"))
			return err
		}

	}

	// Prints days in reverse order (because that's how the UI sorts them)
	begin, end := _between(date, ScopeMonth)
	begin = begin.AddDate(0, 0, -1)
	end = end.AddDate(0, 0, -1)

	// end.Day should max out at limit
	if limit != 0 {
		end = end.AddDate(0, 0, -(end.Day() - int(limit) + 1))
	}

	for end != begin {
		var tasks []Task
		tasksInScope(&tasks, ScopeDay, end)
		// This could be pre-allocated rather than built by append
		(*results) = append(*results, DayTasks{end.Format(DateFormat), tasks})
		end = end.AddDate(0, 0, -1)
	}

	return nil
}

func jsonTasksInDays(c *macaron.Context) {
	var results []DayTasks
	if tasksInDays(c, &results) == nil {
		c.JSON(http.StatusOK, results)
	}
}

func tasksInMonth(c *macaron.Context) {
	//tasksInScopeR(c, ScopeMonth)
	jsonTasksInScope(c, ScopeMonth)
}

func tasksInYear(c *macaron.Context) {
	//tasksInScopeR(c, ScopeYear)
	jsonTasksInScope(c, ScopeYear)
}

func tasksInMonthAndDays(c *macaron.Context) {
	var daysTasks []DayTasks
	var monthTasks []Task
	var err error

	err = tasksInDays(c, &daysTasks)
	if err == nil {
		err = tasksInScopeRequest(c, ScopeMonth, &monthTasks)

		type Result struct {
			Days  []DayTasks
			Month []Task
		}

		if err == nil {
			c.JSON(http.StatusOK, Result{daysTasks, monthTasks})

		}
	}
}

// Update a task's fields by JSON
// Only used when updating statuses at the moment
func taskUpdate(c *macaron.Context, task Task) {
	DB.Where("id = ?", c.Params("id")).First(&task)
	DB.Save(&task)

	task.Sync(false, true, true)
	c.JSON(200, task)
}

func taskNew(c *macaron.Context, task Task) {
	var tasks []Task

	tasksInScope(&tasks, task.Scope, task.Date)
	task.Order = len(tasks)
	DB.Save(&task)

	// If this is a project
	if task.Scope > ScopeYear {
		var scope Scope
		DB.Where("id = ?", task.Scope).First(&scope)
		scope.UpdatedAt = time.Now()
		DB.Save(&scope)
	}

	// If this new task should have stats attached
	task.CalculateStats()

	task.Sync(false, true, true)
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

	// Reorder tasks after this one
	for _, t := range tasks {
		if t.Order > task.Order {
			t.Order = t.Order - 1
		}
		DB.Save(&t)
	}

	task.Sync(true, true, false)

	c.PlainText(http.StatusOK, []byte("OK"))
}

// Change task ordering within scope
func taskSwapOrder(c *macaron.Context, change int, task Task) {
	DB.Where("id = ?", task.ID).First(&task)

	if (change == -1 && task.Order > 0) || change == 1 {
		var swap Task

		from, to := between(task.Date, task.Scope)

		// Find a task to swap with
		DB.Where("date between ? and ? and scope = ? and `order` = ?", from, to, task.Scope, task.Order+change).First(&swap)

		// If there is something to swap it with
		if swap.ID > 0 {
			b := swap.Order
			swap.Order = task.Order
			task.Order = b
			DB.Save(&swap).Save(&task)
		}
	}

	task.SyncScope()

	c.PlainText(http.StatusOK, []byte("OK"))
}

// taskOrderUp moves a task up within a scope
func taskOrderUp(c *macaron.Context, t Task) {
	taskSwapOrder(c, -1, t)
}

// taskOrderDown moves a task down in order within scope
func taskOrderDown(c *macaron.Context, t Task) {
	taskSwapOrder(c, 1, t)
}

// commentUpdate updates or creates a comment
func commentUpdate(c *macaron.Context, comment Comment) {
	var task Task

	cid := comment.ID
	log.Printf("%+v", comment)

	empty := (len(comment.Body) == 0 || comment.Body == "<p><br></p>")
	DB.Where("ID = ?", comment.TaskID).Find(&task)

	if cid == 0 && empty == true {
		// Empty, do not create or update comment
		c.PlainText(200, []byte("OK"))
		return
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
	task.Sync(false, true, true)
	c.PlainText(200, []byte("OK"))
}

// Return list of all buckets by most recent
func getProjects(c *macaron.Context) {
	var scopes []Scope
	DB.Where("id >= ?", ScopeProject).Order("updated_at desc").Find(&scopes)

	c.JSON(200, scopes)
}

func syncProjectList() {
	var scopes []Scope
	DB.Where("id >= ?", ScopeProject).Order("updated_at desc").Find(&scopes)
	habitSync.Send("PROJECTS", scopes)
}

func projectDelete(c *macaron.Context) {
	id, err := strconv.ParseInt(c.Params("id"), 10, 32)

	if err != nil || id < 4 {
		serverError(c, "Failed to parse ID %v", err)
		return
	}

	var scope Scope
	var tasks []Task

	DB.Where("id = ?", id).First(&scope)

	if scope.ID == 0 {
		serverError(c, "Failed to find scope %d", id)
		return
	}

	DB.Where("scope = ?", id).Delete(&tasks)

	DB.Delete(&scope)

	syncProjectList()
	c.PlainText(http.StatusOK, []byte("OK"))
}

func projectNew(c *macaron.Context) {
	var scope Scope
	scope.Name = c.Params("name")
	scope.Pinned = false
	DB.Save(&scope)

	syncProjectList()
	c.PlainText(http.StatusOK, []byte("OK"))
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
	} else {
		c.PlainText(200, out.Bytes())
	}
}

func habitsIndex(c *macaron.Context) {
	c.Data["Page"] = "habits"

	c.HTML(200, "habits")
}

func habitsInit(m *macaron.Macaron) {
	m.Get("/", habitsIndex)

	m.Get("/in-year", tasksInYear)
	m.Get("/in-month", tasksInMonth)
	m.Get("/in-days", jsonTasksInDays)
	m.Get("/in-month-and-days", tasksInMonthAndDays)

	m.Get("/in-project/:id([0-9]+)", tasksInProject)
	m.Get("/projects", getProjects)

	m.Post("/projects/delete/:id([0-9]+)", projectDelete)
	m.Post("/projects/new/:name", projectNew)

	m.Post("/update", binding.Bind(Task{}), taskUpdate)
	m.Post("/new", binding.Bind(Task{}), taskNew)
	m.Post("/delete", binding.Bind(Task{}), taskDelete)
	m.Post("/order-up", binding.Bind(Task{}), taskOrderUp)
	m.Post("/order-down", binding.Bind(Task{}), taskOrderDown)
	m.Post("/comment-update", binding.Bind(Comment{}), commentUpdate)
	m.Post("/export", export)

	m.Get("/sync", habitSync.Handler())
}
