import route from 'riot-route';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as moment from 'moment';
import * as redux from 'redux';

import * as common from './common';

///// BACKEND INTERACTION

export const STATUS_UNSET = 0;
export const STATUS_COMPLETE = 1;
export const STATUS_INCOMPLETE = 2;
export const STATUS_WRAP = 3;

export const SCOPE_UNUSED = 0;
export const SCOPE_DAY = 1;
export const SCOPE_MONTH = 2;
export const SCOPE_YEAR = 3;
export const SCOPE_PROJECT = 4;

export const scopeIsTimeBased = (scope: number) => {
  return scope < SCOPE_PROJECT && scope > SCOPE_UNUSED;
}

export interface Comment extends common.Model {
  Body: string;
}

export interface Task extends common.Model {
  ID: number;
  Hours: number;
  Minutes: number;
  Order: number;
  Status: number;
  Scope: number;
  Name: string;
  Comment?: Comment;
  // Derived statistics
  Streak: number;
  BestStreak: number;
  CompletedTasks: number;
  CompletionRate: number;
  TotalTasks: number;
  TotalTasksWithTime: number;
}

/** Note that this does not track the structure of the backend Scope table but is used for rendering */
export interface Scope {
  Name: string;
  Scope: number;
  Date: moment.Moment;
  Tasks: Array<Task>;
}

export interface Project {
  ID: number;
  Name: string;
}

export interface Day {
  Date: string;
  Tasks: Array<Task>;
}

///// REDUX

type TaskList = Array<Task>;

interface ViewMonth extends common.CommonState {
  type: 'VIEW_MONTH';
  // Navigation & routing
  date: moment.Moment;
  currentProject: number;

  // True after some UI information has been loaded
  mounted: boolean;

  // UI tree
  projects: Array<Project>;
  month: Scope;
  year: Scope;
  days: Array<Scope>;
  project: Scope;
}

type HabitsState = ViewMonth;

interface ChangeRoute {
  type: 'CHANGE_ROUTE';
  date: moment.Moment;
  currentProject: number;
}

interface AddProjectList {
  type: 'ADD_PROJECT_LIST';
  projects: Array<Project>;
}

interface MountDays {
  type: 'MOUNT_DAYS';
  date: moment.Moment;
  days: Array<Day>;
}

interface MountScope {
  type: 'MOUNT_SCOPE';
  scope: number;
  name?: string;
  tasks: TaskList;
  date: moment.Moment;
}

interface UpdateTasks {
  type: 'UPDATE_TASKS';
  tasks: Array<Task>;
}

type HabitsAction = common.CommonAction | MountScope | UpdateTasks | MountDays | ChangeRoute | AddProjectList;

const initialState = {
  type: 'VIEW_MONTH',
  date: moment(),
  mounted: false
} as HabitsState;

/** Check whether a particular scope+date combo is currently rendered and thus needs to be updated */
const dateVisible = (state: HabitsState, scope: number, date: moment.Moment): boolean =>  {
  let date1 = moment.utc(date);
  let date2 = state.date;

  //console.log(`Checking visibility of ${date1.format(common.DAY_FORMAT)} against ${date2.format(common.DAY_FORMAT)}`)
  // Check if a scope is visible by seeing within the current month. For daily and monthly tasks/scopes.
  if(scope == SCOPE_MONTH || scope == SCOPE_DAY) {
    return date1.year() == date2.year() && date1.month() == date2.month();
  }

  if(scope == SCOPE_YEAR) {
    return date1.year() == date2.year();
  }

  // TODO: Check project visibility
  return false;
}

/** Check whether a task is currently updated and thus needs to be updated  */
const taskVisible = (state: HabitsState, task: Task): boolean =>  {
  if(scopeIsTimeBased(task.Scope)) {
    return dateVisible(state, task.Scope, task.Date);
  }
  console.log("Scope not time based, comparing ", state.project.Scope, task.Scope)
  return task.Scope == state.project.Scope;
}

const reducer = (state: HabitsState = initialState, action: HabitsAction): HabitsState => {
  state = common.commonReducer(state, action as common.CommonAction) as HabitsState;
  switch(action.type) {
    case 'ADD_PROJECT_LIST':
      return {...state, projects: action.projects};
    case 'CHANGE_ROUTE':
      return {...state, date: action.date, currentProject: action.currentProject};
    case 'MOUNT_SCOPE':
      if(action.name) {
        return {...state, mounted: true, project: {Name: action.name, Scope: action.scope, Tasks: action.tasks, Date: moment()}}
      }

      // If not provided, this is a time scope and may or may not need to be mounted
      let visible = dateVisible(state, action.scope, action.date);
      if(!visible) {
        console.log("Scope not visible, ignoring");
        return state;
      }
      let scope = {Scope: action.scope, Date: action.date, Tasks: action.tasks} as Scope;
      switch(action.scope) {
        case SCOPE_DAY: 
          let days = state.days;
          return {...state, 
            days: state.days.map((s, i) => {
              return s.Date.diff(action.date, 'days') == 0 ? scope : s;
            })}
        case SCOPE_MONTH: return {...state, mounted: true, month: scope}
        case SCOPE_YEAR: return {...state, mounted: true, year: scope}
      }
      break;
    case 'MOUNT_DAYS':
      let days = Array<Scope>();
      for(let day of action.days) {
        days.push({Date: moment(day.Date, common.DAY_FORMAT), Scope: SCOPE_DAY, Tasks: day.Tasks} as Scope)
      }
      return {...state, mounted: true, days: days};
    case 'UPDATE_TASKS': {
      let nstate = {...state};
      for(let task of action.tasks) {
        // If task is not visible, no need to do anything
        if(taskVisible(state, task)) {
          let updateScope = (scope: Scope): Scope => {
            // New tasks can also come from UPDATE_TASKS
            // New tasks go on the end, so if it's not in the current list
            // it can be appended afterwards
            let append = true;
            let tasks = scope.Tasks.map((t) => {
              if(t.ID == task.ID) {
                append = false;
                return task;
              } else {
                return t;
              }
            })
            if(append) {
              tasks.push(task);
            }
            return {...scope, Tasks: tasks}
          }

          if(task.Scope == SCOPE_MONTH) {
            nstate.month = updateScope(nstate.month);
          } else if(task.Scope == SCOPE_YEAR) {
            nstate.year = updateScope(nstate.year);
          } else if(task.Scope == SCOPE_DAY) {
            // Update only the specific day using diff
            nstate.days = [...state.days.map((s) => s.Date.diff(task.Date, 'days') == 0 ? updateScope(s) : s)]
          } else {
            nstate.project = updateScope(nstate.project);
          }
        } else {
          console.log("Tasks not visible, ignoring");
        }

      }
      return nstate;
    }
  }
  return state;
}

const store = common.makeStore(reducer);

////// REACT

export class CTask extends React.Component<{task: Task}, undefined>{
  cycleStatus() {
    const task = {...this.props.task, Status: (this.props.task.Status + 1) % STATUS_WRAP}
    common.post(store.dispatch, `/habits/update`, task);
  }

  command(path: string) {
    common.post(store.dispatch, `/habits/${path}`, this.props.task)
  }

  setTime() {
    const timestr = window.prompt("Log time (HH:MM or minutes, 0 to clear)")
    if(!timestr) {
      return;
    }
    // Parse something like "5" (5 minutes) or "5:03" (5 hours, 3 minutes)
    const time = timestr.split(":");
    let hours = NaN, minutes = NaN;
    if(time.length == 1) {
      hours = 0;
      minutes = parseInt(time[0], 10);
    } else if(time.length == 2) {
      hours = parseInt(time[0], 10);
      minutes = parseInt(time[1], 10);
    } 

    console.log(hours, minutes);

    if(isNaN(hours) || isNaN(minutes)) {
      store.dispatch({
        type: 'NOTIFICATION_OPEN',
        notification: {error: true, message: `Invalid time string '${time}' (should be HH:MM or MM)`}
      })
      return;
    }

    // Do not update comment
    const task = {...this.props.task, Hours: hours, Minutes: minutes}
    delete task.Comment;
    common.post(store.dispatch, `/habits/update`, task)
  }

  destroy() {
    if(window.confirm("Are you sure you want to delete this task?")) {
      common.post(store.dispatch, `/habits/delete`, this.props.task)
    }
  }

  copyLeft() {
    let scope = this.props.task.Scope - 1;
    let date = this.props.task.Date.utc()
    // Create task on current day from monthly task
    if(scope == SCOPE_DAY) {
      date.date(moment().clone().add(4, 'hour').date())
    } else if(scope == SCOPE_MONTH) {
      date.month(moment().month())
      date.date(moment().date())
    }

    const task = {
      Name: this.props.task.Name,
      Scope: scope,
      Date: date.format("YYYY-MM-DDTHH:mm:ssZ")
    }

    common.post(store.dispatch, "/habits/new", task)
  }

  hasStats() {
    return this.props.task.CompletedTasks > 0;
  }
  
  hasTime() {
    return this.props.task.Hours > 0 || this.props.task.Minutes > 0;
  }

  hasStreak() {
    return this.props.task.Streak > 0 || this.props.task.BestStreak > 0;
  }

  hasCopy() {
    // Copy only functions on month/year scopes
    if(!(this.props.task.Scope == SCOPE_MONTH || this.props.task.Scope == SCOPE_YEAR)) {
      return false;
    };
    return true;
  }

  renderStats() {
    return <span>{' '}
      {this.props.task.CompletedTasks}/{this.props.task.TotalTasks} ({this.props.task.CompletionRate}%)
    </span>
  }

  renderControl(title: string, icon: string, callback: () => void) {
    return <button className={`task-control btn-link btn btn-sm btn-default octicon octicon-${icon}`} title={title}
      onClick = {callback} />
  }

  renderComment() {
    if(this.props.task.Comment) {
      return <div className="comment" dangerouslySetInnerHTML={{__html: this.props.task.Comment.Body}} />
    }
  }

  render() {
    const klass = ['', 'btn-success', 'btn-danger'][this.props.task.Status];
    return <section className="task">
      <button className={`btn btn-xs btn-default ${klass}`} onClick={() => this.cycleStatus()}>
        {this.props.task.Name}
        {this.hasStats() && this.renderStats()}
      </button>
      <span className="float-right">
        {this.hasTime() && <span>
          <span className="octicon octicon-clock"></span>{' '}
          {this.props.task.Hours > 0 && `${this.props.task.Hours}h `}
          {this.props.task.Minutes > 0 && `${this.props.task.Minutes}m`}
        </span>}
        {this.hasStreak() && <span className="streak">{' '}
          <span className="octicon octicon-dashboard"></span>{' '}
          <span>{this.props.task.Streak}/{this.props.task.BestStreak}</span>
          </span>}

        {this.renderControl('Delete task', 'trashcan', () => this.destroy())}  
        {this.props.task.Scope == SCOPE_DAY && 
          this.renderControl('Set time', 'clock', () => this.setTime())}
        {this.hasCopy() &&
          this.renderControl('Copy to the left', 'clippy', () => this.copyLeft())}
        {this.renderControl('Move up', 'chevron-up', () => this.command('order-up'))}
        {this.renderControl('Move down', 'chevron-down', () => this.command('order-down'))}
      </span>
      {this.props.task.Comment && this.renderComment()}
    </section>
  }
}

export class TimeScope extends React.Component<{currentProject: number, currentDate: moment.Moment, scope: Scope}, undefined> {
  navigate(method: 'add' | 'subtract') {
    const unit = this.props.scope.Scope == SCOPE_MONTH ? 'month' : 'year';
    const ndate = this.props.currentDate.clone()[method](1, unit);
    route(`view/${ndate.format(common.MONTH_FORMAT)}/${this.props.currentProject}`);
  }

  addTask() {
    const name = window.prompt("Enter task name (leave empty to cancel): ");
    if(name) {
      common.post(store.dispatch, `/habits/new`, {
        name: name,
        scope: this.props.scope.Scope,
        date: this.props.scope.Date.format("YYYY-MM-DDTHH:mm:ssZ")
      })
    }
  }

  render() {
    return <section className="scope">
      {(this.props.scope.Scope == SCOPE_MONTH || this.props.scope.Scope == SCOPE_YEAR) &&
        <span>
          <button className="btn btn-link btn-sm btn-default octicon octicon-chevron-left" title="Previous"
            onClick={() => this.navigate('subtract')} />
          <button className="btn btn-link btn-sm btn-default octicon octicon-chevron-right" title="Next"
            onClick={() => this.navigate('add')} />
        </span>}
      <button className="btn btn-link btn-sm btn-default octicon octicon-plus" title="New task"
        onClick={() => this.addTask()} />
      <h6 className="scope-title">
        {this.props.scope.Date.format(['', 'dddd Do', 'MMMM', 'YYYY'][this.props.scope.Scope])}
      </h6>
      {this.props.scope.Tasks.map((e, i) => <CTask key={i} task={e} />)}
    </section>
  }
}

export class ProjectScope extends React.Component<{currentProject: number, currentDate: moment.Moment, projects: Array<Project>, scope: Scope}, undefined> {
  changeProject(e: React.SyntheticEvent<HTMLSelectElement>) {
    e.persist();
    let projectID = parseInt(e.currentTarget.value, 10);

    route(`view/${this.props.currentDate.format(common.MONTH_FORMAT)}/${projectID}`)
  }

  render() {
    return <section className="scope">
      <div>
        <select onChange={(o) => this.changeProject(o) } className="form-control" >
          {this.props.projects && this.props.projects.map((e, i) => <option key={i} value={e.ID} >{e.Name}</option>)}
        </select>
      </div>

      <h6 className="scope-title">{this.props.scope.Name}</h6>

      {this.props.scope.Tasks.map((e, i) => <CTask key={i} task={e} />)}
    </section>
  }
}

const HabitsRoot = common.connect()(class extends React.Component<HabitsState, undefined> {
  renderTimeScope(s?: Scope, i?: number) {
    if(s) {
      return <TimeScope currentProject={this.props.currentProject}
        key={i} currentDate={this.props.date} scope={s} />
    } else {
      return <common.Spinner />
    }
  }
  render() {
    return <div >
      <common.NotificationBar notifications={this.props.notifications} dismiss={this.props.dismissNotifications} />
      {this.props.mounted && 
        <div className="row">
          <div className="col-md-3">
            {this.props.days ? 
              this.props.days.map((d, i) => this.renderTimeScope(d, i)) :
              <common.Spinner /> }
          </div>
          <div className="col-md-3">
            {this.renderTimeScope(this.props.month)}
          </div>
          <div className="col-md-3">
            {this.renderTimeScope(this.props.year)}
          </div>
          <div className="col-md-3">
            {this.props.project ?
            <ProjectScope currentProject={this.props.currentProject} currentDate={this.props.date} projects={this.props.projects} scope={this.props.project} />
              : <common.Spinner /> }
          </div>
        </div>}
    </div>
  }
});

document.addEventListener('DOMContentLoaded', () =>  {
  ///// INSTALL ROUTER
  common.installRouter("/habits#", `view/${moment().format(common.MONTH_FORMAT)}/0`, {
    view: (datestr: string, scopestr: string) => {
      let date = moment(datestr, common.MONTH_FORMAT);
      let project = parseInt(scopestr, 10);

      // There are three possible UI changes that can result from this route
      // 1) Month and days need to be remounted (date changed by a month)
      // 2) Months, days and year needs to be remounted (date changed by a year)
      // 3) Project needs to be remounted (currentProject changed)

      let state = store.getState() as HabitsState;
      if(state === undefined) return;
      let prevDate = state.date;
      let prevProject = state.currentProject;

      let timeChanged: 'NO_CHANGE' | 'CHANGE_YEAR' | 'CHANGE_MONTH' = 'NO_CHANGE';

      if(state.mounted === false) {
        // First mount, fetch everything
        timeChanged = 'CHANGE_YEAR';
      } else if(date.format(common.DAY_FORMAT) != prevDate.format(common.DAY_FORMAT)) {
        timeChanged = 'CHANGE_MONTH';
        if(date.year() != prevDate.year()) {
          timeChanged = 'CHANGE_YEAR';
        }
      }

      let projectChanged = prevProject != project;

      //let timeChanged = date.format(common.DAY_FORMAT) != 
      store.dispatch({type: 'CHANGE_ROUTE', date: date, currentProject: project} as HabitsAction)

      // Get day scopes
      if(timeChanged == 'CHANGE_YEAR' || timeChanged == 'CHANGE_MONTH') {
        store.dispatch((dispatch: redux.Dispatch<HabitsState>) => {
          let limit = date.daysInMonth() + 1;
          const today = moment();
          // If we are showing days for the current month, we won't render days that haven't happened yet in advance
          if(today.month() == date.month() && today.year() == date.year()) {
            limit = today.date() + 1;
            // But do mount the next day if it's within 4 hours before midnight so tasks can be added at nighttime
            const next = today.clone().add(4, 'hours');
            if(next.date() != today.date()) {
              limit++;
            }
          }

          interface Day {
            Date: string;
            Tasks: Array<Task>;
          }

          common.get(dispatch, `/habits/in-days?date=${date.format(common.DAY_FORMAT)}&limit=${limit}`,
            ((days: Array<Day>) => {
              days.forEach((d) => {
                d.Tasks.forEach(common.processModel);
              });
              days = days.reverse();
              dispatch({type: 'MOUNT_DAYS', date: date, days: days})
              console.log(days);
            })
          )
        })

        store.dispatch((dispatch: redux.Dispatch<HabitsState>) => {
          common.get(dispatch, `/habits/in-month?date=${date.format(common.DAY_FORMAT)}`, ((tasks: Array<Task>) => {
            tasks.forEach(common.processModel);          
            dispatch({type: 'MOUNT_SCOPE', date: date, scope: SCOPE_MONTH, tasks: tasks} as HabitsAction);
          }));
        })
      }

      if(timeChanged == 'CHANGE_YEAR') {
        store.dispatch((dispatch: redux.Dispatch<HabitsState>) =>{
          common.get(dispatch, `/habits/in-year?date=${date.format(common.DAY_FORMAT)}`, ((tasks: Array<Task>) => {
            tasks.forEach(common.processModel);
            dispatch({type: 'MOUNT_SCOPE', date: date, scope: SCOPE_YEAR, tasks: tasks} as HabitsAction);
          }));
        });
      }

      // Retrieve and mount project list
      store.dispatch((dispatch: redux.Dispatch<HabitsState>) => {
        common.get(dispatch, `/habits/projects`, ((response: Array<Project>) => {
          dispatch({type: 'ADD_PROJECT_LIST', projects: response})
        }))
      })

      // Retrieve and mount requested project
      store.dispatch((dispatch: redux.Dispatch<HabitsState>) => {
        common.get(dispatch, `/habits/in-project/${project}`, ((response: {scope: {Name: String, ID: number}, tasks: Array<Task>}) => {
          response.tasks.forEach(common.processModel);
          dispatch({type: 'MOUNT_SCOPE', date: date, name: response.scope.Name, scope: response.scope.ID, tasks: response.tasks});
        }));
      })
    }
  });

  ///// INSTALL WEBSOCKET
  type HabitMessage = {
    Type: 'UPDATE_TASKS';
    Datum: {
      Tasks: Array<Task>
    }
  } | {
    Type: 'UPDATE_SCOPE';
    Datum: {
      Date: string;
      Scope: number;
      Tasks: Array<Task>;
      Name: string;
    }
  } | {
    Type: 'TASK_CREATE';
    Datum: {
      Task: Array<Task>;
    }
  }

  common.makeSocket('habits/sync', (msg: HabitMessage) => {
    console.log(`Received WebSocket message`, msg);
    switch(msg.Type) {
      case 'UPDATE_TASKS':
        msg.Datum.Tasks.forEach(common.processModel);
        console.log(msg.Datum);
        store.dispatch({type: 'UPDATE_TASKS',
          tasks: msg.Datum.Tasks
        })
        break;

      case 'UPDATE_SCOPE':
        msg.Datum.Tasks.forEach(common.processModel);
       //let scope = {Scope: action.scope, Date: action.date, Tasks: action.tasks} as Scope;
        store.dispatch({type: 'MOUNT_SCOPE', date: moment(msg.Datum.Date, common.DAY_FORMAT),
          scope: msg.Datum.Scope, tasks: msg.Datum.Tasks, name: msg.Datum.Name} as MountScope);
        break;
    }
  })
  
  ///// RENDER
  common.render('habits-root', store, <HabitsRoot />);
})