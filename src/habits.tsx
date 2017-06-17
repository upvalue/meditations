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

export const SCOPE_BUCKET = 0;
export const SCOPE_DAY = 1;
export const SCOPE_MONTH = 2;
export const SCOPE_YEAR = 3;
export const SCOPE_WRAP = 4;

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

export interface Scope {
  Name: string;
  Scope: number;
  Date: moment.Moment;
  Tasks: Array<Task>;
}

export interface Day {
  Date: string;
  Tasks: Array<Task>;
}

///// REDUX

type TaskList = Array<Task>;

interface ViewMonth extends common.CommonState {
  type: 'VIEW_MONTH';
  date: moment.Moment;
  bucket: number;
  month: Scope;
  year: Scope;
  days: Array<Scope>;
  mounted: boolean;
}

type HabitsState = ViewMonth;

interface ChangeRoute {
  type: 'CHANGE_ROUTE';
  date: moment.Moment;
  bucket: number;
}

interface MountDays {
  type: 'MOUNT_DAYS';
  date: moment.Moment;
  days: Array<Day>;
}

interface MountScope {
  type: 'MOUNT_SCOPE';
  scope: number;
  tasks: TaskList;
  date: moment.Moment;
}

interface UpdateTasks {
  type: 'UPDATE_TASKS';
  tasks: Array<Task>;
}

type HabitsAction = common.CommonAction | MountScope | UpdateTasks | MountDays | ChangeRoute;

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
  return dateVisible(state, task.Scope, task.Date);
}

const reducer = (state: HabitsState = initialState, action: HabitsAction): HabitsState => {
  state = common.commonReducer(state, action as common.CommonAction) as HabitsState;
  switch(action.type) {
    case 'CHANGE_ROUTE':
      return {...state, date: action.date, bucket: action.bucket};
    case 'MOUNT_SCOPE':
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
          }
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

export class CScope extends React.Component<{date: moment.Moment, scope: Scope}, undefined> {
  navigate(method: 'add' | 'subtract') {
    const unit = this.props.scope.Scope == SCOPE_MONTH ? 'month' : 'year';
    const ndate = this.props.date.clone()[method](1, unit);
    route(`view/${ndate.format(common.MONTH_FORMAT)}`);
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
      <h6 className="scope-title">
        {this.props.scope.Date.format(['', 'dddd Do', 'MMMM', 'YYYY'][this.props.scope.Scope])}
      </h6>
      {(this.props.scope.Scope == SCOPE_MONTH || this.props.scope.Scope == SCOPE_YEAR) &&
        <span>
          <button className="btn btn-link btn-sm btn-default octicon octicon-chevron-left" title="Previous"
            onClick={() => this.navigate('subtract')} />
          <button className="btn btn-link btn-sm btn-default octicon octicon-chevron-right" title="Next"
            onClick={() => this.navigate('add')} />
        </span>}
      <button className="btn btn-link btn-sm btn-default octicon octicon-plus" title="Add"
        onClick={() => this.addTask()} />
      {this.props.scope.Tasks.map((e, i) => <CTask key={i} task={e} />)}
    </section>
  }
}

const HabitsRoot = common.connect()(class extends React.Component<HabitsState, undefined> {
  render() {
    return <div >
      <common.NotificationBar notifications={this.props.notifications} dismiss={this.props.dismissNotifications} />
      {this.props.mounted ? 
        <div className="row">
          <div className="col-md-3">
            {this.props.days && this.props.days.map((d, i) => <CScope key={i} date={this.props.date} scope={d} />)}
          </div>
          <div className="col-md-3">
            {this.props.month ? 
              <CScope date={this.props.date} scope={this.props.month} /> : ''}
          </div>
          <div className="col-md-3">
            {this.props.year ?
              <CScope date={this.props.date} scope={this.props.year} /> : ''}
          </div>
          <div className="col-md-3">
            <p>Projects</p>
          </div>
        </div> : ''}
    </div>
  }
});

document.addEventListener('DOMContentLoaded', () =>  {
  ///// INSTALL ROUTER
  common.installRouter("/habits#", `view/${moment().format(common.MONTH_FORMAT)}/0`, {
    view: (datestr: string, scopestr: string) => {
      let date = moment(datestr, common.MONTH_FORMAT);
      let scope = parseInt(scopestr, 10);

      store.dispatch({type: 'CHANGE_ROUTE', date: date, bucket: 0} as HabitsAction)

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

      // TODO: Do not remount year when changing month
      store.dispatch((dispatch: redux.Dispatch<HabitsState>) =>{
        common.get(dispatch, `/habits/in-year?date=${date.format(common.DAY_FORMAT)}`, ((tasks: Array<Task>) => {
          tasks.forEach(common.processModel);
          dispatch({type: 'MOUNT_SCOPE', date: date, scope: SCOPE_YEAR, tasks: tasks} as HabitsAction);
        }));
      });
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
          scope: msg.Datum.Scope, tasks: msg.Datum.Tasks} as MountScope);
        break;
    }
  })
  
  ///// RENDER
  common.render('habits-root', store, <HabitsRoot />);
})