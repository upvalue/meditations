import * as moment from 'moment';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as redux from 'redux';
import route from 'riot-route';

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
};

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

/** Note that this does not track the structure of the backend
 * Scope table but is used for rendering */
export interface Scope {
  Name: string;
  Scope: number;
  Date: moment.Moment;
  Tasks: Task[];
}

export interface Project {
  ID: number;
  Name: string;
}

export interface Day {
  Date: string;
  Tasks: Task[];
}

///// REDUX

type TaskList = Task[];

interface ViewMonth extends common.CommonState {
  type: 'VIEW_MONTH';
  // Navigation & routing
  date: moment.Moment;
  currentProject: number;

  // True after some UI information has been loaded
  mounted: boolean;

  // UI tree
  projects: Project[];
  month: Scope;
  year: Scope;
  days: Scope[];
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
  projects: Project[];
}

interface MountDays {
  type: 'MOUNT_DAYS';
  date: moment.Moment;
  days: Day[];
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
  tasks: Task[];
}

type HabitsAction = common.CommonAction | MountScope | UpdateTasks | MountDays | 
  ChangeRoute | AddProjectList;

const initialState = {
  date: moment(),
  mounted: false,
  type: 'VIEW_MONTH',
} as HabitsState;

/** Check whether a particular scope+date combo is
 * currently rendered and thus needs to be updated */
const dateVisible = (state: HabitsState, scope: number, date: moment.Moment): boolean =>  {
  const date1 = moment.utc(date);
  const date2 = state.date;

  // Check if a scope is visible by seeing within the current month.
  // For daily and monthly tasks/scopes.
  if (scope === SCOPE_MONTH || scope === SCOPE_DAY) {
    return date1.year() === date2.year() && date1.month() === date2.month();
  }

  if (scope === SCOPE_YEAR) {
    return date1.year() === date2.year();
  }

  // TODO: Check project visibility
  return false;
};

/** Check whether a task is currently rendered and thus needs to be updated in the UI */
const taskVisible = (state: HabitsState, task: Task): boolean =>  {
  if (scopeIsTimeBased(task.Scope)) {
    return dateVisible(state, task.Scope, task.Date);
  }
  return task.Scope === state.project.Scope;
};

const mountScopeReducer = (state: HabitsState, action: MountScope): HabitsState => {
  if (action.name) {
    if (state.project && action.scope !== state.project.Scope) {
      console.log('Project scope not visible, ignoring');
      return state;
    }
    return {...state, mounted: true, project:
      { Name: action.name, Scope: action.scope, Tasks: action.tasks, Date: moment() } };
  }

  // If not provided, this is a time scope and may or may not need to be mounted
  const visible = dateVisible(state, action.scope, action.date);
  if (!visible) {
    console.log('Scope not visible, ignoring');
    return state;
  }
  const scope = { Scope: action.scope, Date: action.date, Tasks: action.tasks } as Scope;

  switch (action.scope) {
    case SCOPE_DAY: 
      return {...state, 
        days: state.days.map((s, i) => {
          // TODO is diff okay here?
          return s.Date.diff(action.date, 'days') === 0 ? scope : s;
        })};
    case SCOPE_MONTH: return { ...state, mounted: true, month: scope };
    case SCOPE_YEAR: return { ...state, mounted: true, year: scope };
  }
  return state;
};

const reducer = (pstate: HabitsState = initialState, action: HabitsAction): HabitsState => {
  const state = common.commonReducer(pstate, action as common.CommonAction) as HabitsState;
  switch (action.type) {
    case 'ADD_PROJECT_LIST':
      return { ...state, projects: action.projects };

    case 'CHANGE_ROUTE':
      return { ...state, date: action.date, currentProject: action.currentProject };

    case 'MOUNT_SCOPE':
      return mountScopeReducer(state, action);

    case 'MOUNT_DAYS':
      const days = Array<Scope>();
      for (const day of action.days) {
        days.push({
          Date: moment(day.Date, common.DAY_FORMAT), Scope: SCOPE_DAY, Tasks: day.Tasks} as Scope,
        );
      }
      return { ...state, days, mounted: true };

    case 'UPDATE_TASKS': {
      const nstate = { ...state };
      for (const task of action.tasks) {
        // If task is not visible, no need to do anything
        if (taskVisible(state, task)) {
          const updateScope = (scope: Scope): Scope => {
            // New tasks can also come from UPDATE_TASKS
            // New tasks go on the end, so if it's not in the current list
            // it can be appended afterwards
            let append = true;
            const tasks = scope.Tasks.map((t) => {
              if (t.ID === task.ID) {
                append = false;
                return task;
              } else {
                return t;
              }
            });
            if (append) {
              tasks.push(task);
            }
            return { ...scope, Tasks: tasks };
          };

          if (task.Scope === SCOPE_MONTH) {
            nstate.month = updateScope(nstate.month);
          } else if (task.Scope === SCOPE_YEAR) {
            nstate.year = updateScope(nstate.year);
          } else if (task.Scope === SCOPE_DAY) {
            // Update only the specific day using diff
            nstate.days = 
              [...state.days.map(s => s.Date.diff(task.Date, 'days') === 0 ? updateScope(s) : s)];
          } else {
            nstate.project = updateScope(nstate.project);
          }
        } else {
          console.log('Tasks not visible, ignoring');
        }

      }
      return nstate;
    }
  }
  return state;
};

const store = common.makeStore(reducer);

////// REACT

export class CTask extends React.Component<{task: Task}, {editor?: MediumEditor.MediumEditor}>{
  body: HTMLElement;

  componentWillMount() {
    this.setState({});
  }

  cycleStatus() {
    const task = { ...this.props.task, Status: (this.props.task.Status + 1) % STATUS_WRAP };
    common.post(store.dispatch, `/habits/update`, task);
  }

  command(path: string) {
    common.post(store.dispatch, `/habits/${path}`, this.props.task);
  }

  setTime() {
    const timestr = window.prompt('Log time (HH:MM or minutes, 0 to clear)');
    if (!timestr) {
      return;
    }
    // Parse something like "5" (5 minutes) or "5:03" (5 hours, 3 minutes)
    const time = timestr.split(':');
    let hours = NaN;
    let minutes = NaN;
    if (time.length === 1) {
      hours = 0;
      minutes = parseInt(time[0], 10);
    } else if (time.length === 2) {
      hours = parseInt(time[0], 10);
      minutes = parseInt(time[1], 10);
    } 

    console.log(hours, minutes);

    if (isNaN(hours) || isNaN(minutes)) {
      store.dispatch({
        type: 'NOTIFICATION_OPEN',
        notification: { 
          error: true, message: `Invalid time string '${time}' (should be HH:MM or MM)`,
        },
      });
      return;
    }

    // Do not update comment
    const task = { ...this.props.task, Hours: hours, Minutes: minutes };
    delete task.Comment;
    common.post(store.dispatch, `/habits/update`, task);
  }

  destroy() {
    if (window.confirm('Are you sure you want to delete this task?')) {
      common.post(store.dispatch, `/habits/delete`, this.props.task);
    }
  }

  copyLeft() {
    const scope = this.props.task.Scope - 1;
    const date = this.props.task.Date.utc();
    // Create task on current day from monthly task
    if (scope === SCOPE_DAY) {
      date.date(moment().clone().add(4, 'hour').date());
    } else if (scope === SCOPE_MONTH) {
      date.month(moment().month());
      date.date(moment().date());
    }

    const task = {
      Name: this.props.task.Name,
      Scope: scope,
      Date: date.format('YYYY-MM-DDTHH:mm:ssZ'),
    };

    common.post(store.dispatch, '/habits/new', task);
  }

  editComment() {
    if (!this.state.editor) {
      const editor = common.makeEditor(this.body, undefined, () => {
        const newBody = this.body.innerHTML;

        // Do not update if nothing has changed
        if (this.props.task.Comment && newBody === this.props.task.Comment.Body) {
          return;
        }

        common.post(store.dispatch, `/habits/comment-update`, {
          ID: this.props.task.Comment ? this.props.task.Comment.ID : 0,
          Body: this.body.innerHTML,
          TaskID: this.props.task.ID,
        });
      });

      this.setState({ editor });
      this.body.focus();
    }
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
    if (!(this.props.task.Scope === SCOPE_MONTH || this.props.task.Scope === SCOPE_YEAR)) {
      return false;
    }
    return true;
  }

  renderStats() {
    return <span>{' '}
      {this.props.task.CompletedTasks}/{this.props.task.TotalTasks} 
      {' '}({this.props.task.CompletionRate}%)
    </span>;
  }

  renderControl(title: string, icon: string, callback: () => void) {
    return <button 
      className={`task-control btn-link btn btn-sm btn-default octicon octicon-${icon}`}
      title={title}
      onClick = {callback} />;
  }

  renderComment() {
    if (this.props.task.Comment) {
      return <div
        className="comment"
        ref={body => this.body = body} 
        onClick={() => this.editComment()}
        dangerouslySetInnerHTML={{ __html: this.props.task.Comment.Body }} />;
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

        {this.renderControl('Add/edit comment', 'comment', () => this.editComment())}  
        {this.renderControl('Delete task', 'trashcan', () => this.destroy())}  
        {this.props.task.Scope === SCOPE_DAY && 
          this.renderControl('Set time', 'clock', () => this.setTime())}
        {this.hasCopy() &&
          this.renderControl('Copy to the left', 'clippy', () => this.copyLeft())}
        {this.renderControl('Move up', 'chevron-up', () => this.command('order-up'))}
        {this.renderControl('Move down', 'chevron-down', () => this.command('order-down'))}
      </span>
      {this.props.task.Comment && this.renderComment()}
    </section>;
  }
}

export class TimeScope extends
  React.Component<{currentProject: number, currentDate: moment.Moment, scope: Scope}, undefined> {
  navigate(method: 'add' | 'subtract') {
    const unit = this.props.scope.Scope === SCOPE_MONTH ? 'month' : 'year';
    const ndate = this.props.currentDate.clone()[method](1, unit);
    route(`view/${ndate.format(common.MONTH_FORMAT)}/${this.props.currentProject}`);
  }

  addTask() {
    const name = window.prompt('Enter task name (leave empty to cancel): ');
    if (name) {
      common.post(store.dispatch, `/habits/new`, {
        name,
        date: this.props.scope.Date.format('YYYY-MM-DDTHH:mm:ssZ'),
        scope: this.props.scope.Scope,
      });
    }
  }

  render() {
    return <section className="scope">
      {(this.props.scope.Scope === SCOPE_MONTH || this.props.scope.Scope === SCOPE_YEAR) &&
        <span>
          <button
            className="btn btn-link btn-sm btn-default octicon octicon-chevron-left"
            title="Previous"
            onClick={() => this.navigate('subtract')} />
          <button className="btn btn-link btn-sm btn-default octicon octicon-chevron-right"
            title="Next" onClick={() => this.navigate('add')} />
        </span>}
      <button className="btn btn-link btn-sm btn-default octicon octicon-plus" title="New task"
        onClick={() => this.addTask()} />
      <h6 className="scope-title">
        {this.props.scope.Date.format(['', 'dddd Do', 'MMMM', 'YYYY'][this.props.scope.Scope])}
      </h6>
      {this.props.scope.Tasks.map((e, i) => <CTask key={i} task={e} />)}
    </section>;
  }
}

export class ProjectScope extends 
  React.Component<{currentProject: number, currentDate: moment.Moment, projects: Project[],
    scope: Scope}, undefined> {
  changeProject(e: React.SyntheticEvent<HTMLSelectElement>) {
    e.persist();
    const projectID = parseInt(e.currentTarget.value, 10);

    route(`view/${this.props.currentDate.format(common.MONTH_FORMAT)}/${projectID}`);
  }

  render() {
    return <section className="scope">
      <div>
        <select onChange={o => this.changeProject(o) } className="form-control" >
          {this.props.projects &&
            this.props.projects.map((e, i) => <option key={i} value={e.ID} >{e.Name}</option>)}
        </select>
      </div>

      <h6 className="scope-title">{this.props.scope.Name}</h6>

      {this.props.scope.Tasks.map((e, i) => <CTask key={i} task={e} />)}
    </section>;
  }
}

// tslint:disable-next-line:variable-name
const HabitsRoot = common.connect()(class extends React.Component<HabitsState, undefined> {
  renderTimeScope(s?: Scope, i?: number) {
    if (s) {
      return <TimeScope currentProject={this.props.currentProject}
        key={i} currentDate={this.props.date} scope={s} />;
    } else {
      return <common.Spinner />;
    }
  }
  render() {
    return <div >
      <common.NotificationBar notifications={this.props.notifications}
        dismiss={this.props.dismissNotifications} />
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
            <ProjectScope currentProject={this.props.currentProject}
              currentDate={this.props.date} projects={this.props.projects}
              scope={this.props.project} />
              : <common.Spinner /> }
          </div>
        </div>}
    </div>;
  }
});

document.addEventListener('DOMContentLoaded', () =>  {
  ///// INSTALL ROUTER
  common.installRouter('/habits#', `view/${moment().format(common.MONTH_FORMAT)}/0`, {
    view: (datestr: string, scopestr: string) => {
      const date = moment(datestr, common.MONTH_FORMAT);
      const project = parseInt(scopestr, 10);

      // There are three possible UI changes that can result from this route
      // 1) Month and days need to be remounted (date changed by a month)
      // 2) Months, days and year needs to be remounted (date changed by a year)
      // 3) Project needs to be remounted (currentProject changed)

      const state = store.getState() as HabitsState;
      if (state === undefined) return;
      const prevDate = state.date;
      const prevProject = state.currentProject;
      const projects = state.projects;

      let timeChanged: 'NO_CHANGE' | 'CHANGE_YEAR' | 'CHANGE_MONTH' = 'NO_CHANGE';

      if (state.mounted === false) {
        // First mount, fetch everything
        timeChanged = 'CHANGE_YEAR';
      } else if (date.format(common.DAY_FORMAT) !== prevDate.format(common.DAY_FORMAT)) {
        timeChanged = 'CHANGE_MONTH';
        if (date.year() !== prevDate.year()) {
          timeChanged = 'CHANGE_YEAR';
        }
      }

      const projectChanged = prevProject !== project;

      store.dispatch({ date, type: 'CHANGE_ROUTE', currentProject: project } as HabitsAction);

      // Get day scopes
      if (timeChanged === 'CHANGE_YEAR' || timeChanged === 'CHANGE_MONTH') {
        store.dispatch((dispatch: redux.Dispatch<HabitsState>) => {
          let limit = null;
          const today = moment();
          // If we are showing days for the current month,
          // we won't render days that haven't happened yet in advance
          if (today.month() === date.month() && today.year() === date.year()) {
            limit = today.date() + 1;
            // But do mount the next day if it's within 4 hours before midnight so tasks can be
            // added at nighttime
            const next = today.clone().add(4, 'hours');
            if (next.date() !== today.date()) {
              limit += 1;
            }
          }

          let qs = `/habits/in-month-and-days?date=${date.format(common.DAY_FORMAT)}`;
          qs += `${limit ? '&limit=' + limit : ''}`;


          common.get(dispatch, qs,
            ((response: { Days: Day[], Month: Task[] }) => {
              response.Days.forEach((d) => {
                d.Tasks.forEach(common.processModel);
              });

              response.Month.forEach(common.processModel);

              dispatch({ date, type: 'MOUNT_DAYS', days: response.Days });
              dispatch({ date, type: 'MOUNT_SCOPE', scope: SCOPE_MONTH, tasks: response.Month });
            }),
           );
        });
      }

      if (timeChanged === 'CHANGE_YEAR') {
        store.dispatch((dispatch: redux.Dispatch<HabitsState>) => {
          common.get(dispatch, `/habits/in-year?date=${date.format(common.DAY_FORMAT)}`,
          ((tasks: Task[]) => {
            tasks.forEach(common.processModel);
            dispatch({ date, tasks, type: 'MOUNT_SCOPE', scope: SCOPE_YEAR } as HabitsAction);
          }));
        });
      }

      // Retrieve and mount project list
      if (!projects) {
        store.dispatch((dispatch: redux.Dispatch<HabitsState>) => {
          common.get(dispatch, `/habits/projects`, ((response: Project[]) => {
            dispatch({ type: 'ADD_PROJECT_LIST', projects: response });
          }));
        });
      }

      // Retrieve and mount requested project
      if (projectChanged) {
        store.dispatch((dispatch: redux.Dispatch<HabitsState>) => {
          common.get(dispatch, `/habits/in-project/${project}`,
            ((response: { scope: { Name: string, ID: number }, tasks: Task[] }) => {
              response.tasks.forEach(common.processModel);
              dispatch({
                date, type: 'MOUNT_SCOPE', name: response.scope.Name,
                scope: response.scope.ID, tasks: response.tasks,
              });
            }));
        });
      }
    },
  });

  ///// INSTALL WEBSOCKET
  type HabitMessage = {
    Type: 'UPDATE_TASKS';
    Datum: {
      Tasks: Task[],
    }
  } | {
    Type: 'UPDATE_SCOPE';
    Datum: {
      Date: string;
      Scope: number;
      Tasks: Task[],
      Name: string;
    }
  } | {
    Type: 'TASK_CREATE';
    Datum: {
      Task: Task[];
    }
  };

  common.makeSocket('habits/sync', (msg: HabitMessage) => {
    console.log(`Received WebSocket message`, msg);
    switch (msg.Type) {
      case 'UPDATE_TASKS':
        msg.Datum.Tasks.forEach(common.processModel);
        console.log(msg.Datum);
        store.dispatch({type: 'UPDATE_TASKS',
          tasks: msg.Datum.Tasks,
        });
        break;

      case 'UPDATE_SCOPE':
        msg.Datum.Tasks.forEach(common.processModel);
        store.dispatch({type: 'MOUNT_SCOPE', date: moment(msg.Datum.Date, common.DAY_FORMAT),
          scope: msg.Datum.Scope, tasks: msg.Datum.Tasks, name: msg.Datum.Name} as MountScope);
        break;
    }
  });
  
  ///// RENDER
  common.render('habits-root', store, <HabitsRoot />);
});
