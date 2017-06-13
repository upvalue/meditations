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
  Hours: number | null;
  Order: number;
  Status: number;
  Scope: number;
  Name: string;
  // Derived statistics
  BestStreak: number | null;
  CompletedTasks: number | null;
  CompletionRate: number | null;
  TotalTasks: number | null;
  TotalTasksWithTime: number | null;
}

export interface Scope {
  Name: string;
  Scope: number;
  Date: moment.Moment;
  Tasks: Array<Task>;
}

///// REDUX

type TaskList = Array<Task>;

interface ViewMonth extends common.CommonState {
  type: 'VIEW_MONTH';
  date: moment.Moment;
  month: Scope;
  year: Scope;
  mounted: boolean;
}

type HabitsState = ViewMonth;

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

type HabitsAction = common.CommonAction | MountScope | UpdateTasks;

const initialState = {
  type: 'VIEW_MONTH',
  date: moment(),
  mounted: false
} as HabitsState;

const taskVisible = (state: HabitsState, task: Task): boolean =>  {
  let date1 = moment.utc(task.Date);
  let date2 = state.date;
  // Check if a task is visible by seeing whether it is within the current month or year, depending on scope
  if((((task.Scope == SCOPE_MONTH || task.Scope == SCOPE_DAY)) && date1.month() == date2.month() &&
    date1.year() == date2.year()) ||
    (task.Scope == SCOPE_YEAR && date1.year() == date2.year())) {
      return true;
    }
  // TODO: Buckets/projects
  return false;
}

const reducer = (state: HabitsState = initialState, action: HabitsAction): HabitsState => {
  state = common.commonReducer(state, action as common.CommonAction) as HabitsState;
  switch(action.type) {
    case 'MOUNT_SCOPE':
      switch(action.scope) {
        // TODO: Code duplication
        case SCOPE_MONTH:
          return {...state, mounted: true, month: {Scope: SCOPE_MONTH, Date: action.date, Tasks: action.tasks} as Scope};
        case SCOPE_YEAR:
          return {...state, mounted: true, year: {Scope: SCOPE_YEAR, Date: action.date, Tasks: action.tasks} as Scope};
      }
    case 'UPDATE_TASKS': {
      let nstate = {...state};
      for(let task of action.tasks) {
        // If task is not visible, no need to do anything
        if(taskVisible(state, task)) {
          if(task.Scope == SCOPE_MONTH) {
            let scope = state.month;
            nstate.month = {...state.month, 
              Tasks: scope.Tasks.map((t) => t.ID == task.ID ? task : t)}
            return nstate;
          }
        }
      }
      console.log("update ye tasks");
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

  render() {
    const klass = ['', 'btn-success', 'btn-danger'][this.props.task.Status];
    return <section className="task">
      <button className={`btn btn-xs btn-default ${klass}`} onClick={() => this.cycleStatus()}>
        {this.props.task.Name}
      </button>
    </section>
  }
}

export class CScope extends React.Component<{date: moment.Moment, scope: Scope}, undefined> {
  render() {
    return <div>
      <h6 className="scope-title">
        {this.props.date.format(['','','MMMM', 'YYYY'][this.props.scope.Scope])}
      </h6>
      {this.props.scope.Tasks.map((e, i) => <CTask key={i} task={e} />)}
    </div>
  }
}

const HabitsRoot = common.connect()(class extends React.Component<HabitsState, undefined> {
  render() {
    return <div className="container-fluid">
      <common.NotificationBar notifications={this.props.notifications} dismiss={this.props.dismissNotifications} />
      {this.props.mounted ? 
        <div className="row">
          <div className="col-md-3">
            <p>Days</p>
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
  }

  common.makeSocket('habits/sync', (msg: HabitMessage) => {
    switch(msg.Type) {
      case 'UPDATE_TASKS':
        msg.Datum.Tasks.forEach(common.processModel);
        console.log(msg.Datum);
        store.dispatch({type: 'UPDATE_TASKS',
          wholescope: msg.Datum.Wholescope,
          tasks: msg.Datum.Tasks
        })
        break;

    }
    console.log("Received message", msg);
  })
  
  ///// RENDER
  common.render('habits-root', store, <HabitsRoot />);
})
