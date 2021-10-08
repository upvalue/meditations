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
	"strings"
	"time"

	"github.com/go-macaron/binding"
	"github.com/jinzhu/gorm"
	"github.com/unknwon/com"
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
	DB.Where("scope = ?", scope.ID).Order("position asc").Find(&tasks)
	c.JSON(http.StatusOK, map[string]interface{}{
		"scope": scope,
		"tasks": tasks,
	})
}

// tasksInScopeRequest fetches tasks with statistics in a given scope, extracting a date from
// the Macaron context
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

func tasksInDays(c *macaron.Context, results *[]Task) error {
	date, err := time.Parse(DateFormat, c.Query("date"))
	if err != nil {
		serverError(c, "error parsing date %s", c.Query("date"))
		return err
	}

	// Prints days in reverse order (because that's how the UI sorts them)
	begin, end := _between(date, ScopeMonth)

	fmt.Printf("%v %v\n", begin.Format(DateFormat), end.Format(DateFormat))

	DB.
		Where("date BETWEEN ? and ? and scope = ?", begin, end, ScopeDay).Order("position asc, date asc").
		Find(results)

	return nil
}

func tasksInYear(c *macaron.Context) {
	//tasksInScopeR(c, ScopeYear)
	jsonTasksInScope(c, ScopeYear)
}

func tasksInMonthAndDays(c *macaron.Context) {
	var daysTasks []Task
	var monthTasks []Task
	var err error

	err = tasksInDays(c, &daysTasks)
	if err == nil {
		err = tasksInScopeRequest(c, ScopeMonth, &monthTasks)

		type Result struct {
			Days  []Task
			Month []Task
		}

		if err == nil {
			c.JSON(http.StatusOK, Result{daysTasks, monthTasks})

		}
	}

}

func taskSelectScope(date *time.Time, to *time.Time, name *string, scope *int) func(db *gorm.DB) *gorm.DB {
	return func(db *gorm.DB) *gorm.DB {
		// If to is set, this is a date range
		if to != nil {
			db = db.Where("date between ? and ?", date.Format(DateFormat), to.AddDate(0, 0, 1).Format(DateFormat))
		} else if date != nil {
			// Otherwise it's just a date
			db = db.Where("date(date) = date(?)", *date)
		}

		if name != nil {
			db = db.Where("name = ?", name)
		}

		if scope != nil {
			db = db.Where("scope = ?", scope)
		}

		return db
	}
}

func taskSelectSingle(c *macaron.Context) {
	var task Task

	DB.Where("id = ?", c.ParamsInt("id")).First(&task)

	c.JSON(http.StatusOK, task)
}

func taskSelect(c *macaron.Context) {
	var tasks []Task

	var from *time.Time
	var to *time.Time
	var name *string

	if c.Query("date") != "" {
		date, err := time.Parse(DateFormat, c.Query("date"))
		if err != nil {
			serverError(c, "invalid date %s", date)
		}
		from = &date
	} else if c.Query("from") != "" {
		if c.Query("to") == "" {
			serverError(c, "expected `to` in addition to `from`")
		}

		date, err := time.Parse(DateFormat, c.Query("from"))
		if err != nil {
			serverError(c, "invalid date %s", date)
		}
		from = &date

		date2, err2 := time.Parse(DateFormat, c.Query("to"))
		if err2 != nil {
			serverError(c, "invalid date %s", date)
		}
		to = &date2
	}

	if c.Query("name") != "" {
		names := c.Query("name")
		name = &names
	}

	if c.Query("scope") != "" {
		scopes := strings.Split(c.Query("scope"), ",")
		results := make(map[int]interface{})
		for _, scope := range scopes {
			scopeint := com.StrTo(scope).MustInt()

			db := DB.Scopes(taskSelectScope(from, to, name, &scopeint))
			db.Find(&tasks)

			results[scopeint] = tasks
		}

		c.JSON(http.StatusOK, results)
	} else {
		DB.Scopes(taskSelectScope(from, to, name, nil)).Find(&tasks)
		c.JSON(http.StatusOK, tasks)
	}
}

// taskUpdate updates a task's fields with JSON, and optionally will create
// or update a comment as well
func taskUpdate(c *macaron.Context, task Task) {
	DB.Save(&task)

	task.Sync(false, true, true)
	serverOK(c)
}

func taskNew(c *macaron.Context, task Task) {
	var tasks []Task

	tasksInScope(&tasks, task.Scope, task.Date)
	task.Position = len(tasks)
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
	serverOK(c)
}

func taskDelete(c *macaron.Context) {
	var tasks []Task

	var task Task

	DB.Where("id = ?", c.ParamsInt("id")).First(&task)

	if task.ID == 0 {
		serverOK(c)
		return
	}

	task.Near(&tasks)

	DB.LogMode(true)
	log.Printf("%+v", task)

	tx := DB.Begin()

	tx.Delete(&task)

	// Task deletion necessitates re-ordering every task after this task,
	// within its scope

	for _, t := range tasks {
		if t.ID == task.ID {
			continue
		}
		if t.Position > task.Position {
			t.Position = t.Position - 1
		}
		tx.Save(&t)
	}

	tx.Commit()
	DB.LogMode(false)

	task.Sync(true, true, false)

	serverOK(c)
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
	srcOrder := src.Position
	fmt.Printf("SRC ORDER %v TARGET ORDER %v\n", srcOrder, target.Position)

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
		srcTasks[i].Position = i
	}

	if !withinScope {
		for i := range targetTasks {
			targetTasks[i].Position = i
		}
	}

	fmt.Printf("Re-ordered tasks\n")

	if !withinScope {
		fmt.Printf("out of scope: re-ordering target scope\n")
		for _, t := range targetTasks {
			fmt.Printf("%d %s\n", t.Position, t.Name)
			DB.Save(&t)
		}
		syncScopeImpl(targetScope, targetDate)
	}

	for _, t := range srcTasks {
		fmt.Printf("%d %s\n", t.Position, t.Name)
		DB.Save(&t)
	}

	syncScopeImpl(srcScope, srcDate)

	serverOK(c)
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
	serverOK(c)
}

func projectNew(c *macaron.Context, project Scope) {
	// Allow recreation of deleted projects
	var scope Scope
	DB.Where("name = ? AND deleted_at != NULL", project.Name).Find(&scope)

	if scope.DeletedAt != nil {
		// Allow recreation of deleted projects
		scope.DeletedAt = nil
		DB.Save(&scope)
	} else {
		DB.Save(&project)
	}

	syncProjectList()
	serverOK(c)
}

func projectUpdate(c *macaron.Context, project Scope) {
	DB.Save(&project)

	syncProjectList()
	serverOK(c)
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

	DB.Table("tasks").Select("name, scope, status, date, comment").Where(query, name, scopes, begin, end).Scan(&results)

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
	m.Get("/", productionBuildHandler)

	m.Get("/in-year", tasksInYear)
	m.Get("/in-month-and-days", tasksInMonthAndDays)

	m.Get("/in-project/:id:int", tasksInProject)
	m.Get("/project/:id:int/:days:int", getProject)
	m.Get("/projects/:days:int", getProjects)
	// m.Post("/projects/new/:name", projectNew)

	m.Post("/reorder/:src:int/:target:int", taskReorder)
	m.Post("/export", export)

	// REST-ish api
	m.Get("/tasks", taskSelect)
	m.Get("/tasks/:id:int", taskSelectSingle)
	m.Put("/tasks/:id:int", binding.Bind(Task{}), taskUpdate)
	m.Post("/tasks", binding.Bind(Task{}), taskNew)
	m.Delete("/tasks/:id:int", taskDelete)

	m.Post("/projects", binding.Bind(Scope{}), projectNew)
	m.Put("/projects/:id:int", binding.Bind(Scope{}), projectUpdate)
	m.Delete("/projects/:id:int", projectDelete)

	m.Get("/sync", habitSync.Handler())
}
