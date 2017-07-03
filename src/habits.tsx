import * as moment from 'moment';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as redux from 'redux';
import route from 'riot-route';
import * as ReactDnd from 'react-dnd';
import HTML5Backend from 'react-dnd-html5-backend';

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

/** 
 * Used to measure recent project activity, combined with ProjectDays on the backend such that e.g.
 * 24 out of the last 72 days having a project-related task in them would be considered extremely
 * active, 18 somewhat active, and so on. Should be divisible by 4.
 */

export const PROJECT_ACTIVITY_BENCHMARK = 24;

/**
 * Determines at what point in time the next day's scope will be made available. The default of 4
 * hours means it will be available at 8PM local time. */
export const MOUNT_NEXT_DAY_TIME = 4;

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

export type Project = {
  ID: number;
  Name: string;
  Pinned: false;
  CompletedTasks: number;
} | {
  ID: number;
  Name: string;
  Pinned: true;
  CompletedTasks: number;
};

export interface Day {
  Date: string;
  Tasks: Task[];
}

///// REDUX

type TaskList = Task[];

interface ViewMonth extends common.CommonState {
  type: 'VIEW_MONTH';
  // Navigation & routing
  currentDate: moment.Moment;
  // Current project; if 0, a list of projects will be displayed instead
  currentProject: number;

  // True after some UI information has been loaded
  mounted: boolean;

  // UI tree
  pinnedProjects: Project[];
  unpinnedProjects: Project[];
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
  type: 'PROJECT_LIST';
  pinnedProjects: Project[];
  unpinnedProjects: Project[];
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
  currentDate: moment(),
  mounted: false,
  type: 'VIEW_MONTH',
} as HabitsState;

/** Check whether a particular scope+date combo is
 * currently rendered and thus needs to be updated */
const dateVisible = (state: HabitsState, scope: number, date: moment.Moment): boolean =>  {
  const date1 = moment.utc(date);
  const date2 = state.currentDate;

  // Check if a scope is visible by looking within the current month.
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

/** Check whether a given task is in the same scope as another task */
const taskSameScope = (left: Task, right: Task) => {
  if (left.Scope !== right.Scope) {
    return false;
  }

  // If task is part of the same project, then date is irrelevant
  if (left.Scope >= SCOPE_PROJECT) {
    return true;
  }

  // It is possible for tasks to have different Dates and still be in the same scope, e.g.
  // one yearly task has been created in January, the other in February, and thus their dates are
  // different.
  let fmt = '';
  switch (left.Scope) {
    case SCOPE_DAY: fmt = 'YYYY-MM-DD';
    case SCOPE_MONTH: fmt = 'YYYY-MM';
    case SCOPE_YEAR: fmt = 'YYYY';
  }

  return left.Date.format(fmt) === right.Date.format(fmt);
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
    if (state.currentProject !== action.scope) {
      // console.log('Project scope not visible, ignoring');
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

const reducer = (state: HabitsState, action: HabitsAction): HabitsState => {
  switch (action.type) {
    case 'PROJECT_LIST':
      return { ...state, pinnedProjects: action.pinnedProjects,
        unpinnedProjects: action.unpinnedProjects };

    case 'CHANGE_ROUTE':
      return { ...state, currentDate: action.date, currentProject: action.currentProject };

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

const [store, typedDispatch, thunkDispatch] = common.createStore(reducer, initialState);

////// REACT

/** Convenience method; returns route argument for a given date and project. */
const routeForView = (date: moment.Moment, project?: number) => {
  return `view/${date.format(common.MONTH_FORMAT)}/${project ? project : 0}`;
};

/** Returns URL to link to a given date and project */
const urlForView = (date: moment.Moment, project?: number) => {
  return `#${routeForView(date, project)}`;
};


export interface TaskProps {
  // Drag and drop implementation props
  connectDropTarget: ReactDnd.ConnectDropTarget;
  connectDragSource: ReactDnd.ConnectDragSource;
  connectDragPreview: ReactDnd.ConnectDragPreview;
  isDragging: boolean;
  isOver: boolean;
  isOverCurrent: boolean;
  
  // Actual props
  task: Task;
}

// Drag and drop implementation details
const taskSource: ReactDnd.DragSourceSpec<TaskProps> = {
  beginDrag: (props, monitor, component) => {
    // Make the task data available when this task is dropped
    return {
      task: props.task,
    };
  },

};

const taskTarget: ReactDnd.DropTargetSpec<TaskProps> = {
  drop(props, monitor, component) {
    // Possible cases:

    if (component && monitor) {
      const src = (monitor.getItem() as any).task;
      console.log(monitor.getItemType());
      const target = props.task;
      
      // Do not allow dropping on self
      if (src.ID === target.ID) {
        return;
      }

      if (taskSameScope(src, target)) {
        // Task dropped on task in same scope; trigger a re-order
        common.post(typedDispatch, `/habits/reorder/${src.ID}/${target.ID}`);
      }
    }
  },
};

/**
 * Component representing a task.
 * This is decorated immediately after using react-dnd methods;
 * for some reason using them directly as decorators fails.
 */
export class CTaskImpl extends common.Editable<TaskProps> {
  cycleStatus() {
    const task = { ...this.props.task, Status: (this.props.task.Status + 1) % STATUS_WRAP };
    common.post(typedDispatch, `/habits/update`, task);
  }

  command(path: string) {
    common.post(typedDispatch, `/habits/${path}`, this.props.task);
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
      typedDispatch({
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
    common.post(typedDispatch, `/habits/update`, task);
  }

  destroy() {
    if (window.confirm('Are you sure you want to delete this task?')) {
      common.post(typedDispatch, `/habits/delete`, this.props.task);
    }
  }

  copyLeft() {
    const scope = this.props.task.Scope - 1;
    const date = this.props.task.Date.utc();
    // Create task on current day from monthly task
    if (scope === SCOPE_DAY) {
      date.date(moment().clone().add(MOUNT_NEXT_DAY_TIME, 'hour').date());
    } else if (scope === SCOPE_MONTH) {
      date.month(moment().month());
      date.date(moment().date());
    }

    const task = {
      Name: this.props.task.Name,
      Scope: scope,
      Date: date.format('YYYY-MM-DDTHH:mm:ssZ'),
    };

    common.post(typedDispatch, '/habits/new', task);
  }

  editorUpdated() {
    return !this.props.task.Comment || this.body.innerHTML !== this.props.task.Comment.Body;
  }

  editorSave() {
    common.post(typedDispatch, `/habits/comment-update`, {
      ID: this.props.task.Comment ? this.props.task.Comment.ID : 0,
      Body: this.body.innerHTML,
      TaskID: this.props.task.ID,
    });
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
        onClick={e => this.editorOpen(e)}
        dangerouslySetInnerHTML={{ __html: this.props.task.Comment.Body }} />;
    }
  }

  render() {
    const { isDragging, connectDragSource, connectDragPreview, connectDropTarget,
      isOver, isOverCurrent } = this.props;
    // Create a draggable task button.
    const klass = ['', 'btn-success', 'btn-danger'][this.props.task.Status];
    const taskButton_ =
      <button className={`btn btn-xs btn-default ${klass}`} onClick={() => this.cycleStatus()}>
        {this.props.task.Name}
        {this.hasStats() && this.renderStats()}
      </button>;

    const taskButton = 
      connectDragPreview(<span>{connectDragSource(taskButton_)}</span>);

    const opacity = isDragging ? 0.5 : 1;
    const backgroundColor = isOver ? '#cccccc' : '';
    const style = { opacity } as any;

    // If a dragged task is hovering over this, draw a black border beneath it
    if (isOver) {
      style['border'] = '0px';
      style['borderBottom'] = '2px';
      style['borderColor'] = 'black';
      style['borderStyle'] = 'solid';
    }

    const result =  <section className="task" style={style}>
      {taskButton}
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

        {this.renderControl('Add/edit comment', 'comment', () => this.editorOpen())}  
        {this.renderControl('Delete task', 'trashcan', () => this.destroy())}  
        {this.props.task.Scope === SCOPE_DAY && 
          this.renderControl('Set time', 'clock', () => this.setTime())}
        {this.hasCopy() &&
          this.renderControl('Copy to the left', 'clippy', () => this.copyLeft())}
      </span>
      {this.props.task.Comment && this.renderComment()}
    </section>;

    return connectDropTarget(result);
  }
} // CTaskImpl

// Apply DND decorators to CTaskImpl

// Decorate task component as a drag source
const CTaskImplDraggable = ReactDnd.DragSource('TASK', taskSource, (connect, monitor) => {
  return {
    connectDragSource: connect.dragSource(),
    connectDragPreview: connect.dragPreview(),
    isDragging: monitor.isDragging(),
  };
})(CTaskImpl);

// Decorate task component as a drop target
const CTask = ReactDnd.DropTarget('TASK', taskTarget, (connect, monitor) => {
  return {
    connectDropTarget: connect.dropTarget(),
    isOver: monitor.isOver(),
    isOverCurrent: monitor.isOver({ shallow: true }),
  };
})(CTaskImplDraggable);

const CTaskFactory = React.createFactory(CTask);

// Finally, this method is used to create instances of CTask in a type-checked way

const createCTask = (key: number, task: Task) => {
  return CTaskFactory({ key, task } as any);
};

export class TimeScope extends
  React.Component<{currentProject: number, currentDate: moment.Moment, scope: Scope}, undefined> {
  navigate(method: 'add' | 'subtract') {
    const unit = this.props.scope.Scope === SCOPE_MONTH ? 'month' : 'year';
    const ndate = this.props.currentDate.clone()[method](1, unit);
    route(routeForView(ndate, this.props.currentProject));
  }

  addTask() {
    const name = window.prompt('Enter task name (leave empty to cancel): ');
    if (name) {
      common.post(typedDispatch, `/habits/new`, {
        name,
        date: this.props.scope.Date.format('YYYY-MM-DDTHH:mm:ssZ'),
        scope: this.props.scope.Scope,
      });
    }
  }

  render() {
    const tasks = this.props.scope.Tasks.map((t, i) => {
      return createCTask(i, t);
    });

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
      {...tasks}
    </section>;
  }
}

/** Returns project activity indicator */
const projectActivityIcon = (p: Project) => { 
  const fraction = PROJECT_ACTIVITY_BENCHMARK / 4;
  const recentActivity = (Math.min(p.CompletedTasks, PROJECT_ACTIVITY_BENCHMARK) -
    (p.CompletedTasks % fraction)) / 6;
  const recentActivityString = 
    ['little activity', 'some activity', 'lots of activity', 'immense activity'][recentActivity];
  return <span className = {`octicon octicon-flame project-activity-${recentActivity}`}
    title={``} />;
};

export interface ProjectScopeProps {
  currentDate: moment.Moment;
  scope: Scope;
}

export class ProjectScope extends React.Component<ProjectScopeProps, undefined> {
  changeProject(e: React.SyntheticEvent<HTMLSelectElement>) {
    e.persist();
    const projectID = parseInt(e.currentTarget.value, 10);

    if (isNaN(projectID)) return;

    route(`view/${this.props.currentDate.format(common.MONTH_FORMAT)}/${projectID}`);
  }

  addTask() {
    const name = window.prompt('Enter task name (leave empty to cancel): ');
    if (name) {
      common.post(typedDispatch, `/habits/new`, {
        name,
        date: this.props.scope.Date.format('YYYY-MM-DDTHH:mm:ssZ'),
        scope: this.props.scope.Scope,
      });
    }
  }

  render() {
    const tasks = this.props.scope.Tasks.map((t, i) => {
      return createCTask(i, t);
    });
    return <section className="scope">
      <div>
        <h6 className="scope-title">
          <span><a href={`#view/${this.props.currentDate.format(common.MONTH_FORMAT)}/0`}>
            Projects</a></span> 
          <span> &gt; {this.props.scope.Name}</span></h6>
      </div>

      <button className="btn btn-link btn-sm btn-default octicon octicon-plus" title="New task"
        onClick={() => this.addTask()} />
      <h6 className="scope-title">{this.props.scope.Name}</h6>

      {...tasks}

    </section>;
  }
}

export interface ProjectListProps {
  pinnedProjects: Project[];
  unpinnedProjects: Project[];
  currentDate: moment.Moment;
}

export class ProjectList extends React.Component<ProjectListProps, undefined> {
  deleteProject(id: number) {
    if (window.confirm('Are you sure you want to delete this project?')) {
      common.post(typedDispatch, `/habits/projects/delete/${id}`);
    }
  }

  pinProject(p: Project) {
    common.post(typedDispatch, `/habits/projects/toggle-pin/${p.ID}`);
  }

  copyLeft(p: Project) {
    const task = {
      Name: p.Name,
      Scope: SCOPE_DAY,
      Date: moment().format('YYYY-MM-DDTHH:mm:ssZ'),
    };

    common.post(typedDispatch, '/habits/new', task);

  }

  renderProjectLink(project: Project) {
    return <div key={project.ID}>
      {project.Pinned && projectActivityIcon(project)}

      <a href={urlForView(this.props.currentDate, project.ID)}>{project.Name}</a>

      <span className="float-right">
        <span className="task"> {/* used for smaller font*/}
          {project.CompletedTasks}
        </span>
        <span className="task-control btn-link btn-sm btn-default octicon octicon-clippy"
          onClick={() => this.copyLeft(project) } />
        <span className="task-control btn-link btn-sm btn-default octicon octicon-pin"
          onClick={() => this.pinProject(project) } />
        <span className="task-control btn-link btn-sm btn-default octicon octicon-trashcan" 
          onClick={() => this.deleteProject(project.ID)} />
      </span>
    </div>;
  }

  addProject() {
    const name = window.prompt('New project name (leave empty to cancel)');
    if (name) {
      common.post(typedDispatch, `/habits/projects/new/${name}`);
    }
  }

  render() {
    return <div>
      <button className="btn btn-link octicon octicon-plus" title="Add new project"
        onClick={() => this.addProject()} />
      <h6 className="scope-title">Projects</h6>
      {this.props.pinnedProjects.map(p => this.renderProjectLink(p))}
      <hr />
      {this.props.unpinnedProjects.map(p => this.renderProjectLink(p))}

    </div>;
  }

}


// tslint:disable-next-line:variable-name
const HabitsRoot = ReactDnd.DragDropContext(HTML5Backend)(
common.connect()(class extends React.Component<HabitsState, undefined> {
  /** Render time-based scope (days, months, years) */
  renderTimeScope(s?: Scope, i?: number) {
    if (s) {
      return <TimeScope currentProject={this.props.currentProject}
        key={i} currentDate={this.props.currentDate} scope={s} />;
    } else {
      return <common.Spinner />;
    }
  }

  /** Render either a list of projects or the currently open project */
  renderProjects() {
    if (this.props.currentProject === 0) {
      return <ProjectList currentDate={this.props.currentDate}
        pinnedProjects={this.props.pinnedProjects}
        unpinnedProjects ={this.props.unpinnedProjects} />;
    } else {
      if (this.props.project && this.props.currentProject === this.props.project.Scope) {
        return <ProjectScope  currentDate={this.props.currentDate} scope={this.props.project} />;
      } else {
        // In case the route has changed, but the project data has not been loaded yet.
        return <common.Spinner />;
      }
    }
  }

  render() {
    return <div id="habits-root-sub">
      <common.CommonUI {...this.props} />
      {this.props.mounted && 
        <div className="row">
          <div id="habits-scope-daily" className="col-md-3">
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
            {this.props.pinnedProjects ? this.renderProjects() : <common.Spinner />}
          </div>
        </div>}
    </div>;
  }
}));

/** Habits entry point. Sets up router, socket, and renders root. */
export const main = () => {
  ///// INSTALL ROUTER
  common.installRouter('/habits#', `view/${moment().format(common.MONTH_FORMAT)}/0`, {
    no_action: () => {
      route(routeForView(moment(), 0));
    },
    habits: () => {},
    view: (datestr: string, scopestr: string) => {
      const date = moment(datestr, common.MONTH_FORMAT);
      const project = parseInt(scopestr, 10);

      // There are three possible UI changes that can result from this route
      // 1) Month and days need to be remounted (date changed by a month)
      // 2) Months, days and year needs to be remounted (date changed by a year)
      // 3) Project needs to be remounted (currentProject changed)

      const state = store.getState() as HabitsState;
      if (state === undefined) return;
      const prevDate = state.currentDate;
      const prevProject = state.currentProject;

      let timeChanged: 'NO_CHANGE' | 'CHANGE_YEAR' | 'CHANGE_MONTH' = 'NO_CHANGE';

      if (state.mounted === false) {
        // First mount, fetch everything
        timeChanged = 'CHANGE_YEAR';
      } else if (date.format(common.DAY_FORMAT) !== prevDate.format(common.DAY_FORMAT)) {
        // After first mount, fetch only what has changed
        timeChanged = 'CHANGE_MONTH';
        if (date.year() !== prevDate.year()) {
          timeChanged = 'CHANGE_YEAR';
        }
      }

      const projectChanged = prevProject !== project;

      typedDispatch({ date, type: 'CHANGE_ROUTE', currentProject: project });

      // Get day scopes
      if (timeChanged === 'CHANGE_YEAR' || timeChanged === 'CHANGE_MONTH') {
        thunkDispatch((dispatch) => {
          let limit = null;
          const today = moment();
          // If we are showing days for the current month,
          // we won't render days that haven't happened yet in advance
          if (today.month() === date.month() && today.year() === date.year()) {
            limit = today.date() + 1;
            // But do mount the next day if it's within 4 hours before midnight so tasks can be
            // added at nighttime
            const next = today.clone().add(MOUNT_NEXT_DAY_TIME, 'hours');
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
        thunkDispatch((dispatch) => {
          common.get(dispatch, `/habits/in-year?date=${date.format(common.DAY_FORMAT)}`,
          ((tasks: Task[]) => {
            tasks.forEach(common.processModel);
            dispatch({ date, tasks, type: 'MOUNT_SCOPE', scope: SCOPE_YEAR } as HabitsAction);
          }));
        });
      }

      // Retrieve and mount project list
      if (!state.pinnedProjects) {
        thunkDispatch((dispatch) => {
          common.get(dispatch, `/habits/projects`, ((response:
            { Pinned: Project[], Unpinned: Project[] }) => {
            dispatch({ type: 'PROJECT_LIST', pinnedProjects: response.Pinned,
              unpinnedProjects: response.Unpinned });
          }));
        });
      }

      // Retrieve and mount requested project
      if (projectChanged) {
        thunkDispatch((dispatch) => {
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
  } | {
    Type: 'PROJECTS';
    Datum: {
      Pinned: Project[];
      Unpinned: Project[];
    }
  };

  common.makeSocket('habits/sync', (msg: HabitMessage) => {
    console.log(`Received WebSocket message`, msg);
    switch (msg.Type) {
      case 'UPDATE_TASKS':
        msg.Datum.Tasks.forEach(common.processModel);
        console.log(msg.Datum);
        typedDispatch({type: 'UPDATE_TASKS',
          tasks: msg.Datum.Tasks,
        });
        break;

      case 'UPDATE_SCOPE':
        msg.Datum.Tasks.forEach(common.processModel);
        typedDispatch({type: 'MOUNT_SCOPE', date: moment(msg.Datum.Date, common.DAY_FORMAT),
          scope: msg.Datum.Scope, tasks: msg.Datum.Tasks, name: msg.Datum.Name} as MountScope);
        break;

      case 'PROJECTS':
        typedDispatch({ type: 'PROJECT_LIST', pinnedProjects: msg.Datum.Pinned,
          unpinnedProjects: msg.Datum.Unpinned});
        break;
    }
  });
  
  ///// RENDER
  common.render('habits-root', store, <HabitsRoot />);
};
