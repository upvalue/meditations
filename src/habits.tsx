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

export interface Task extends common.Model {
  ID: number;
  Hours: number;
  Minutes: number;
  Order: number;
  Status: number;
  Scope: number;
  Name: string;
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
  month: Scope;
  year: Scope;
  days: Array<Scope>;
  mounted: boolean;
}

type HabitsState = ViewMonth;

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
  wholescope: boolean;
  tasks: Array<Task>;
}

type HabitsAction = common.CommonAction | MountScope | UpdateTasks | MountDays;

const initialState = {
  type: 'VIEW_MONTH',
  date: moment(),
  mounted: false
} as HabitsState;

/** Check whether a particular scope+date combo is currently rendered and thus needs to be updated */
const dateVisible = (state: HabitsState, scope: number, date: moment.Moment): boolean =>  {
  let date1 = moment.utc(date);
  let date2 = state.date;
  // Check if a scope is visible by seeing within the current month. For daily and monthly tasks/scopes.
  if(scope == SCOPE_MONTH || scope == SCOPE_DAY) {
    return date1.year() == date2.year() && date1.month() == date2.month();
  }

  if(scope == SCOPE_YEAR) {
    return date1.year() == date2.year();
  }

  // TODO: Buckets & projects
}

/** Check whether a task is currently updated and thus needs to be updated  */
const taskVisible = (state: HabitsState, task: Task): boolean =>  {
  return dateVisible(state, task.Scope, task.Date);
}

const reducer = (state: HabitsState = initialState, action: HabitsAction): HabitsState => {
  state = common.commonReducer(state, action as common.CommonAction) as HabitsState;
  switch(action.type) {
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
            return {...scope, 
              Tasks: scope.Tasks.map((t) => t.ID == task.ID ? task: t)};
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

  orderUp() {
    console.log("Order up!");
  }

  orderDown() {

  }

  hasStats() {
    return this.props.task.CompletedTasks > 0;
  }
  
  hasTime() {
    return this.props.task.Hours > 0 || this.props.task.Minutes > 0;
  }

  hasStreak() {
    return this.props.task.Streak > 0;
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

        {this.renderControl('Move up', 'chevron-up', () => this.command('order-up'))}
        {this.renderControl('Move down', 'chevron-down', () => this.command('order-down'))}
      </span>
    </section>
  }
}

export class CScope extends React.Component<{date: moment.Moment, scope: Scope}, undefined> {
  render() {
    return <section className="scope">
      <h6 className="scope-title">
        {this.props.scope.Date.format(['', 'dddd Do', 'MMMM', 'YYYY'][this.props.scope.Scope])}
      </h6>
      {this.props.scope.Tasks.map((e, i) => <CTask key={i} task={e} />)}
    </section>
  }
}

const HabitsRoot = common.connect()(class extends React.Component<HabitsState, undefined> {
  render() {
    return <div className="container-fluid">
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

      // Todo make this more efficeint
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
      Wholescope: boolean
      Tasks: Array<Task>
    }
  } | {
    Type: 'UPDATE_SCOPE';
    Datum: {
      Date: string;
      Scope: number;
      Tasks: Array<Task>;
    }
  }

  common.makeSocket('habits/sync', (msg: HabitMessage) => {
    console.log("Received WebSocket message ${msg}");
    switch(msg.Type) {
      case 'UPDATE_TASKS':
        msg.Datum.Tasks.forEach(common.processModel);
        console.log(msg.Datum);
        store.dispatch({type: 'UPDATE_TASKS',
          wholescope: msg.Datum.Wholescope,
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
    console.log("Received message", msg);
  })
  
  ///// RENDER
  common.render('habits-root', store, <HabitsRoot />);
})