package backend

// habits.go - habits todo list functionality

import (
	"fmt"
	"math"
	"time"

	"github.com/jinzhu/gorm"
	"github.com/jinzhu/now"
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

// TaskStats tracks statistics for monthly, yearly and project tasks.
type TaskStats struct {
	ID             uint `gorm:"primary_key"`
	CreatedAt      time.Time
	UpdatedAt      time.Time
	DeletedAt      *time.Time `sql:"column:deleted_time"`
	CompletedTasks int
	TotalTasks     int
	BestStreak     int
	Streak         int
}

// Task represents a task in the database
type Task struct {
	ID        uint
	CreatedAt time.Time
	UpdatedAt time.Time
	DeletedAt *time.Time
	Name      string
	// The actual date of the task, regardless of when it was created
	Date time.Time
	// The status of the task: complete, incomplete, or unset
	Status int
	// The scope of the task (monthly, yearly, daily)
	Scope int
	// The task's position within that scope
	Position int
	// Time stats (in day-scoped tasks, these are set directly by the user; in monthly/yearly scopes,
	// they are calculated from daily tasks)
	Minutes int
	// Comment
	Comment string
	// These statistics are derived at runtime, and not represented in SQL
	CompletionRate     float64 `sql:"-"`
	CompletedTasks     int     `sql:"-"`
	TotalTasks         int     `sql:"-"`
	TotalTasksWithTime int     `sql:"-"`
	BestStreak         int     `sql:"-"`
	Streak             int     `sql:"-"`
}

const (
	// ProjectDays is used when calculating how many days in the past to include in project recent
	// activity information
	ProjectDays = 72
)

// Scope represents a task's scope. Time-based scopes (daily, monthly, yearly) are built-in, but the
// user can add additional "projects," each of which have their own scope with an ID of ScopeProject
// or greater
type Scope struct {
	gorm.Model
	Name string `gorm:"not null;unique"`
	// Hidden projects will not be displayed unless a checkbox is checked
	Visibility int `gorm:"not null;default:'1'"`
	// Derived statistics
	CompletedTasks int `gorm:"-"`
	Minutes        int `gorm:"-"`
	// ProgressDirection indicates whether a user has been doing more or less on a project recently;
	// it's used to grow or shrink the flame indicator
	ProgressDirection int `gorm:"-"`
}

const (
	// VisibilityHidden means a project will not be shown unless a checkbox to that effect is ticked
	VisibilityHidden = 0
	// VisibilityUnpinned means projects will be displayed with statistics for all-time, and no
	// activity flame
	VisibilityUnpinned = 1
	// VisibilityPinned means projects will be displayed with statistics and a flame indicator
	// based on recent activity
	VisibilityPinned = 2
)

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

	DB.Where("date BETWEEN ? and ? and scope = ? and name = ? and deleted_at is null", from, to, ScopeDay, task.Name).Order("date", true).Find(&tasks)

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
	var minutes int

	from, to := between(task.Date, task.Scope)

	// Complex queries: we sum the hours and minutes of all tasks, count all tasks, and finally count all completed tasks
	rows, err := DB.Table("tasks").Select("count(*), sum(minutes)").Where("date between ? and ? and scope = ? and name = ? and deleted_at is null", from, to, ScopeDay, task.Name).Rows()

	DB.Model(&task).Where("date between ? and ? and scope = ? and name = ? and status = ? and deleted_at is null", from, to, ScopeDay, task.Name, TaskComplete).Find(&tasks).Count(&completed)

	if err == nil {
		defer rows.Close()
		for rows.Next() {
			rows.Scan(&total, &minutes)
		}
	}

	rows, err = DB.Table("tasks").Select("count(*)").Where("date between ? and ? and scope = ? and name = ? and (minutes is not null) ",
		from, to, ScopeDay, task.Name).Rows()

	if err == nil {
		defer rows.Close()
		for rows.Next() {
			rows.Scan(&totalWithTime)
		}
	}

	// Calculate completion rate
	if total == 0.0 {
		rate = -1.0
	} else if completed == total {
		rate = 100.0
	} else {
		rate = math.Floor((completed * 100.0) / total)
	}

	task.Minutes, task.CompletedTasks, task.TotalTasks, task.TotalTasksWithTime, task.CompletionRate = minutes,
		int(completed), int(total), int(totalWithTime), rate
}

// CalculateStats calculates all statistics for monthly and yearly tasks
func (task *Task) CalculateStats() {
	if task.Scope == ScopeMonth || task.Scope == ScopeYear {
		task.CalculateTimeAndCompletion()
		if task.Scope == ScopeYear {
			task.CalculateStreak()
		}
	}
}

//
///// TASK SYNCHRONIZATION
//

type habitSyncMsg struct {
	Tasks     []Task
	ProjectID uint
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

	habitSync.Send("UPDATE_TASKS_AND_PROJECT", habitSyncMsg{
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
	var project Scope

	if task.Scope == ScopeDay {
		var year Task
		from, to := between(task.Date, ScopeYear)
		DB.Where("name = ? and date between ? and ? and scope = ?", task.Name, from, to, ScopeYear).First(&year)
		if year.ID != 0 {
			year.CalculateStats()
			tasks = append(tasks, year)
		}

		var month Task
		from, to = between(task.Date, ScopeMonth)
		DB.Where("name = ? and date between ? and ? and scope = ?", task.Name, from, to, ScopeMonth).First(&month)
		if month.ID != 0 {
			month.CalculateStats()
			tasks = append(tasks, month)
		}

		// Sync projects
		DB.Where("name = ?", task.Name).Preload("Project").First(&project)

	} else if task.Scope == ScopeYear || task.Scope == ScopeMonth {

		task.CalculateStats()
	}

	if includeMainTask == true {
		tasks = append(tasks, *task)
	}

	// It is possible for this to result in zero tasks to send, if a task has been deleted and
	// no stat recalculations are necessary
	if len(tasks) != 0 {
		fmt.Printf("Calling GRAPHQL PUSH!\n")
		graphqlPush("UPDATE_TASKS_AND_PROJECT", habitSyncMsg{
			Tasks:     tasks,
			ProjectID: project.ID,
		})

		habitSync.Send("UPDATE_TASKS_AND_PROJECT", habitSyncMsg{
			Tasks:     tasks,
			ProjectID: project.ID,
		})
	}

}

type scopeSyncMsg struct {
	Date  string
	Scope int
	Tasks []Task
	Name  string
}

// syncScopeImpl re-sends an entire scope given scope and date as an int; it's used when tasks are
// moved, deleted or added and thus the entire scope needs to be updated
func syncScopeImpl(scope int, date time.Time) {
	var tasks []Task

	tasksInScope(&tasks, scope, date)

	for i := range tasks {
		tasks[i].CalculateStats()
	}

	var scopeName string

	// If this is a project, we also need to include the name
	if scope >= ScopeProject {
		var scoperec Scope
		DB.Where("ID = ?", scope).First(&scoperec)

		scopeName = scoperec.Name
	}

	message := scopeSyncMsg{
		Date:  date.Format(DateFormat),
		Scope: scope,
		Tasks: tasks,
		Name:  scopeName,
	}

	habitSync.Send("UPDATE_SCOPE", message)
}

// TaskSyncScope re-sends a task's entire scope. Necessary when order is changed or a task is deleted
func (task *Task) TaskSyncScope() {
	syncScopeImpl(task.Scope, task.Date)
}

// Sync sends updates to the UI as necessary after a task changes
func (task *Task) Sync(updateScope bool, recalculate bool, includeMainTask bool) {
	if updateScope {
		task.TaskSyncScope()
	}

	if recalculate {
		task.SyncWithStats(includeMainTask)
	}
}

//
///// SCOPE OPERATIONS
//

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

// between returns a range of dates to find all tasks within a scope
// This is the primary method of building a query that targets all tasks within a scope.
func between(start time.Time, scope int) (string, string) {
	from, to := _between(start, scope)
	return from.Format(DateFormat), to.Format(DateFormat)
}

var tasksInScopeCalls = 0

// tasksInScope returns all the tasks in a given scope and timeframe, ordered by order
func tasksInScope(tasks *[]Task, scope int, start time.Time) {
	if scope >= ScopeProject {
		DB.Where("scope = ?", scope).Order("position asc").Find(tasks)
	} else {
		from, to := between(start, scope)

		tasksInScopeCalls = tasksInScopeCalls + 1

		DB.Where("date BETWEEN ? and ? and scope = ?", from, to, scope).Order("position asc").
			Find(tasks)
	}
}

// CalculateProjectStats calculates project statistics
func (project *Scope) CalculateProjectStats(days int) {
	var past, comparePastBegin, comparePastEnd time.Time
	// Compare the previous 10% of this time slice to get an idea of whether the user
	// has been doing more or less to progress on a particular project
	compareDiff := (int(math.Ceil(float64(days) / 10)))

	if project.Visibility == VisibilityPinned {
		past = time.Now().AddDate(0, 0, -days)

		comparePastBegin = time.Now().AddDate(0, 0, -(days + compareDiff))
		comparePastEnd = time.Now().AddDate(0, 0, -compareDiff)
		fmt.Printf("Comparing how many completed tasks are in the range %v to %v (%v days) compared to %v to present\n", comparePastBegin, comparePastEnd, compareDiff, past)
	} else {
		// For non-pinned projects, calculate total time always
		past = time.Now().AddDate(-30, 0, 0)
	}

	var count struct{ Count int }
	DB.Table("tasks").Select("count(*) as count").Where("scope = ? and name = ? and date > ? and status = ?",
		ScopeDay, project.Name, past, TaskComplete).Scan(&count)

	var minutes struct{ Minutes int }
	DB.Table("tasks").Select("sum(minutes) as minutes").
		Where("scope = ? and name = ? and date > ? and status = ?",
			ScopeDay, project.Name, past, TaskComplete).
		Scan(&minutes)

	project.CompletedTasks = count.Count
	project.Minutes = minutes.Minutes
}

// ProjectListMsg is sent both as a result of GETting /habits/projects and syncing project list
// through the socket
type ProjectListMsg struct {
	Pinned   []Scope
	Unpinned []Scope
	Hidden   []Scope
}

// getProjectList returns struct with slices of pinned and unpinned projects
func getProjectList(days int) ProjectListMsg {
	var pinnedProjects []Scope
	var unpinnedProjects []Scope
	var hiddenProjects []Scope

	DB.Where("id >= ? and visibility = 0", ScopeProject).Order("name").Find(&hiddenProjects)
	DB.Where("id >= ? and visibility = 1", ScopeProject).Order("name").Find(&unpinnedProjects)
	DB.Where("id >= ? and visibility = 2", ScopeProject).Order("name").Find(&pinnedProjects)

	for i := range pinnedProjects {
		pinnedProjects[i].CalculateProjectStats(days)
	}

	for i := range unpinnedProjects {
		unpinnedProjects[i].CalculateProjectStats(days)
	}

	return ProjectListMsg{pinnedProjects, unpinnedProjects, hiddenProjects}
}

// syncProjectList sends an updated list of projects over the socket
func syncProjectList() {
	habitSync.Send("GET_PROJECT_LIST", nil)
}
