package backend

// habitsweb.go - All Habits functions dealing directly with requests

import (
	"bytes"
	"encoding/json"
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

	task.clearCache()
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
	task.clearCache()
	task.CalculateStats()

	task.Sync(false, true, true)
	c.PlainText(http.StatusOK, []byte("OK"))
}

func taskDelete(c *macaron.Context, task Task) {
	var comment Comment
	var tasks []Task

	DB.Where("id = ?", c.Params("id")).First(&task)

	task.clearCache()
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

// taskReorder places a task (the src) after a given task (the target), and reorders the entire
// scope as appropriate
func taskReorder(c *macaron.Context) {
	// This is a bit of a mess
	// Because it has to support several cases of varying complexity
	// Moving a task within a scope
	// Moving a task through scopes

	var src, target Task

	DB.LogMode(true)
	DB.Where("id = ?", c.ParamsInt("src")).Find(&src)
	DB.Where("id = ?", c.ParamsInt("target")).Find(&target)
	DB.LogMode(false)

	// We have to compare dates formatted, as dates not be exactly equal (tasks that are copied from
	// other scopes have slightly different times in the date column than those added by the user)
	withinScope := src.Date.Format("2006-02-01") == target.Date.Format("2006-02-01") && src.Scope == target.Scope

	fmt.Printf("%v %v\n", src.Date, target.Date)
	fmt.Printf("Re-ordering tasks within scope %v\n", withinScope)
	srcOrder := src.Order
	fmt.Printf("SRC ORDER %v TARGET ORDER %v\n", srcOrder, target.Order)

	if src.ID == 0 || target.ID == 0 {
		serverError(c, fmt.Sprintf("Task re-ordering failed, could not find one of task %s,%s",
			c.Params("src"), c.Params("target")))
		return
	}

	srcScope := src.Scope
	srcDate := src.Date

	targetScope := target.Scope
	targetDate := target.Date

	var srcTasks []Task
	var targetTasks []Task
	tasksInScope(&srcTasks, src.Scope, src.Date)

	if !withinScope {
		tasksInScope(&targetTasks, target.Scope, target.Date)
	}

	// Remove src from scope
	for i, t := range srcTasks {
		if t.ID == src.ID {
			srcTasks = append(srcTasks[:i], srcTasks[i+1:]...)
		}
	}

	// Reinsert after target
	if withinScope {
		for i, t := range srcTasks {
			if t.ID == target.ID {
				srcTasks = append(srcTasks[:i+1], append([]Task{src}, srcTasks[i+1:]...)...)
				break
			}
		}
	} else {
		src.Date = target.Date
		src.Scope = target.Scope
		for i, t := range targetTasks {
			if t.ID == target.ID {
				targetTasks = append(targetTasks[:i+1], append([]Task{src}, targetTasks[i+1:]...)...)
				break
			}
		}
	}

	// Recreate order list
	for i := range srcTasks {
		srcTasks[i].Order = i
	}

	if !withinScope {
		for i := range targetTasks {
			targetTasks[i].Order = i
		}
	}

	fmt.Printf("Re-ordered tasks\n")

	if !withinScope {
		fmt.Printf("out of scope: re-ordering target scope\n")
		for _, t := range targetTasks {
			fmt.Printf("%d %s\n", t.Order, t.Name)
			DB.Save(&t)
		}
		syncScopeImpl(targetScope, targetDate)
	}

	for _, t := range srcTasks {
		fmt.Printf("%d %s\n", t.Order, t.Name)
		DB.Save(&t)
	}

	syncScopeImpl(srcScope, srcDate)

	c.PlainText(200, []byte("OK"))
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

// getProject retrieves information about a particular project;
// called when time or completion information changes
func getProject(c *macaron.Context) {
	id := c.ParamsInt("id")
	days := c.ParamsInt("days")
	var project Scope
	DB.Where("id = ?", id).First(&project)

	project.CalculateProjectStats(days)

	c.JSON(200, project)
}

func getProjects(c *macaron.Context) {
	days := c.ParamsInt("days")
	c.JSON(200, getProjectList(days))
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

// export a summary of tasks in human readable format (e.g. to give an exercise or diet log to your
// trainer)
func export(c *macaron.Context) {
	var buffer bytes.Buffer
	var scopes []string

	body := struct {
		Name  string
		Begin string
		End   string
		Day   bool
	}{"", "", "", false}

	bodybytes, _ := c.Req.Body().Bytes()
	err := json.Unmarshal(bodybytes, &body)

	if err != nil {
		serverError(c, "export: Could not unmarshal JSON body")
		return
	}

	name := body.Name
	begin := body.Begin
	end := body.End

	// Build a list of scopes
	if body.Day == true {
		scopes = append(scopes, fmt.Sprintf("%d", ScopeDay))
	}

	// If dates are not provided, include everything in the DB
	if begin == "" {
		begin = time.Date(1960, time.January, 1, 0, 0, 0, 0, time.Local).Format(DateFormat)
	}

	if end == "" {
		end = time.Now().AddDate(0, 0, 1).Format(DateFormat)
	} else {
		// Increment by a day so search is inclusive; e.g. a search ending with July 2, 2017 will include
		// tasks created on July 2, 2017.

		endDate, _ := time.Parse(DateFormat, body.End)
		end = endDate.AddDate(0, 0, 1).Format(DateFormat)
	}

	name = fmt.Sprintf("%%%s%%", name)

	query := "name like ? and scope in (?) and date >= date(?) and date < date(?)"

	// Necessary to declare a custom struct here; I couldn't figure out how to coax the results of a
	// join into the Task.Comment struct.

	var results []struct {
		Name    string
		Date    time.Time
		Scope   int
		Status  int
		Comment string
	}

	DB.Table("tasks").Select("name, scope, status, date, comments.body as comment").Joins("left join comments on comments.task_id = tasks.id").
		Where(query, name, scopes, begin, end).Scan(&results)

	for _, t := range results {
		datefmt := "Monday, January _2, 2006"
		if t.Scope == ScopeYear {
			datefmt = "2006"
		} else if t.Scope == ScopeMonth {
			datefmt = "2006-01"
		}
		buffer.WriteString(fmt.Sprintf("%s %s %s\r\n", t.Name, t.Date.Format(datefmt), t.Comment))
	}

	// TODO: Remove unsightly <br> backslashes
	// Convert HTML to markdown for plaintext readability
	process := exec.Command("pandoc", "-f", "html", "-t", "markdown")
	var out bytes.Buffer
	process.Stdin = strings.NewReader(buffer.String())
	process.Stdout = &out
	err = process.Run()
	if err != nil {
		// If pandoc failed, just output HTML
		c.JSON(http.StatusOK, map[string]interface{}{
			"body": string(buffer.Bytes()),
		})
	} else {
		c.JSON(http.StatusOK, map[string]interface{}{
			"body": string(out.Bytes()),
		})
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
	m.Get("/project/:id:int/:days:int", getProject)
	m.Get("/projects/:days:int", getProjects)

	m.Post("/projects/delete/:id:int", projectDelete)
	m.Post("/projects/new/:name", projectNew)
	m.Post("/projects/toggle-pin/:id:int", projectTogglePin)

	m.Post("/update", binding.Bind(Task{}), taskUpdate)
	m.Post("/new", binding.Bind(Task{}), taskNew)
	m.Post("/delete", binding.Bind(Task{}), taskDelete)
	m.Post("/reorder/:src:int/:target:int", taskReorder)
	m.Post("/comment-update", binding.Bind(Comment{}), commentUpdate)
	m.Post("/export", export)

	m.Get("/sync", habitSync.Handler())
}
