package backend

// habitsweb.go - All Habits functions dealing directly with requests

import (
	"bytes"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os/exec"
	"strconv"
	"strings"
	"time"

	"github.com/go-macaron/binding"
	macaron "gopkg.in/macaron.v1"
)

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
	c.PlainText(200, []byte("OK"))
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

// taskSwapOrdering places a task (the src) after a given task (the target), and reorders the entire
// scope as appropriate
func taskReorder(c *macaron.Context) {
	var src, target Task

	DB.LogMode(true)
	DB.Where("id = ?", c.ParamsInt("src")).Find(&src)
	DB.Where("id = ?", c.ParamsInt("target")).Find(&target)
	DB.LogMode(false)

	srcOrder := src.Order
	fmt.Printf("SRC ORDER %v TARGET ORDER %v\n", srcOrder, target.Order)

	if src.ID == 0 || target.ID == 0 {
		serverError(c, fmt.Sprintf("Task re-ordering failed, could not find one of task %s,%s",
			c.Params("src"), c.Params("target")))
		return
	}

	var scopeTasks []Task
	tasksInScope(&scopeTasks, target.Scope, target.Date)

	// Remove src from scope
	for i, t := range scopeTasks {
		if t.ID == src.ID {
			scopeTasks = append(scopeTasks[:i], scopeTasks[i+1:]...)
		}
	}

	// Reinsert after target
	for i, t := range scopeTasks {
		if t.ID == target.ID {
			scopeTasks = append(scopeTasks[:i+1], append([]Task{src}, scopeTasks[i+1:]...)...)
			break
		}
	}

	// Recreate order list
	for i := range scopeTasks {
		scopeTasks[i].Order = i
	}

	fmt.Printf("Re-ordered tasks\n")
	for _, t := range scopeTasks {
		fmt.Printf("%d %s\n", t.Order, t.Name)
		DB.Save(&t)
	}

	src.SyncScope()
	c.PlainText(200, []byte("OK"))
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

func getProjects(c *macaron.Context) {
	c.JSON(200, getProjectList())
}

// projectPost parses a project ID and fetches it from the DB, returning an error if it can't be
// found
func projectPost(c *macaron.Context, scope *Scope) (int, error) {
	id := c.ParamsInt("id")

	DB.Where("id = ?", id).First(&scope)

	if scope.ID == 0 {
		serverError(c, "Failed to find scope %d", id)
		return 0, errors.New("Failed to find scope")
	}

	return id, nil
}

func projectDelete(c *macaron.Context) {
	var scope Scope
	var tasks []Task

	id, err := projectPost(c, &scope)

	if err != nil {
		return
	}

	DB.Where("scope = ?", id).Delete(&tasks)

	DB.Delete(&scope)

	syncProjectList()
	c.PlainText(http.StatusOK, []byte("OK"))
}

// projectTogglePin pins or unpins a project
func projectTogglePin(c *macaron.Context) {
	var scope Scope

	_, err := projectPost(c, &scope)

	if err != nil {
		return
	}

	scope.Pinned = !scope.Pinned

	DB.Save(&scope)
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

	m.Get("/in-project/:id:int", tasksInProject)
	m.Get("/projects", getProjects)

	m.Post("/projects/delete/:id:int", projectDelete)
	m.Post("/projects/new/:name", projectNew)
	m.Post("/projects/toggle-pin/:id:int", projectTogglePin)

	m.Post("/update", binding.Bind(Task{}), taskUpdate)
	m.Post("/new", binding.Bind(Task{}), taskNew)
	m.Post("/delete", binding.Bind(Task{}), taskDelete)
	m.Post("/reorder/:src:int/:target:int", taskReorder)
	m.Post("/order-up", binding.Bind(Task{}), taskOrderUp)
	m.Post("/order-down", binding.Bind(Task{}), taskOrderDown)
	m.Post("/comment-update", binding.Bind(Comment{}), commentUpdate)
	m.Post("/export", export)

	m.Get("/sync", habitSync.Handler())
}
