import * as moment from 'moment';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as redux from 'redux';
import route from 'riot-route';
import * as ReactDnd from 'react-dnd';
import DatePicker from 'react-datepicker';
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
  Pinned: boolean;
  CompletedTasks: number;
};

export interface Day {
  Date: string;
  Tasks: Task[];
}

///// REDUX

type TaskList = Task[];

interface FilterState {
  name?: string;
  begin?: moment.Moment | null;
  /** Filter ending date */
  end?: moment.Moment | null;
}

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

  // Filtering
  filter: FilterState;
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

/** Update state to filter tasks by name */
interface FilterByName {
  type: 'FILTER_BY_NAME';
  name?: string;
}

/** Update state to add a beginning or end date to the filter */
interface FilterByDate {
  type: 'FILTER_BY_DATE';
  date: moment.Moment | null;
  end: boolean;
}

interface FilterClear {
  type: 'FILTER_CLEAR';
}

type HabitsAction = common.CommonAction | MountScope | UpdateTasks | MountDays | 
  ChangeRoute | AddProjectList | FilterByName | FilterByDate | FilterClear;

const initialState = {
  currentDate: moment(),
  mounted: false,
  type: 'VIEW_MONTH',
  filter: {},
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
              [...state.days.map(s =>
                s.Date.format(common.DAY_FORMAT) === task.Date.format(common.DAY_FORMAT) ?
                  updateScope(s) : s)];
          } else {
            nstate.project = updateScope(nstate.project);
          }
        } else {
          console.log('Tasks not visible, ignoring');
        }

      }
      return nstate;
    }
    case 'FILTER_BY_NAME': {
      return { ...state, filter: { ...state.filter, name: action.name } };
    }

    case 'FILTER_CLEAR': {
      return { ...state, filter: { name: state.filter.name } };
    }

    case 'FILTER_BY_DATE': {
      const nfilter = { ...state.filter };
      nfilter[action.end ? 'end' : 'begin'] = action.date;
      return { ...state, filter: nfilter };
    }
  }
  return state;
};

const [store, dispatch] = common.createStore(reducer, initialState);

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
        common.post(`/habits/reorder/${src.ID}/${target.ID}`);
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
    common.post(`/habits/update`, task);
  }

  command(path: string) {
    common.post(`/habits/${path}`, this.props.task);
  }

  parseTime(timestr: string) {
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

    return [hours, minutes];
  }

  setTime() {
    common.modalPromptChecked('Log time (HH:MM or MM, 0 to reset)', 'Set time',
      '',
      (timestr: string) => {
        const [hours, minutes] = this.parseTime(timestr);

        if (isNaN(hours) || isNaN(minutes)) {
          return 'Invalid time string';
        }

        return '';
      },
      (timestr: string) => {
        const [hours, minutes] = this.parseTime(timestr);

        // Do not update comment
        const task = { ...this.props.task, Hours: hours, Minutes: minutes };
        delete task.Comment;
        common.post(`/habits/update`, task);
      });
  }

  destroy() {
    common.modalConfirm('Are you sure you want to delete this task?',
      'Delete this task!', () => common.post('/habits/delete', this.props.task));
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

    common.post('/habits/new', task);
  }

  editorUpdated() {
    return !this.props.task.Comment || this.body.innerHTML !== this.props.task.Comment.Body;
  }

  editorSave() {
    common.post(`/habits/comment-update`, {
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

  /** Render an octicon button tied to a specific task action */
  renderControl(tip: string, icon:string, callback: () => void, danger?: boolean) {
    return <common.OcticonButton tooltip={tip} name={icon} onClick={callback} 
      className="pl-1" />;
  }

  renderComment() {
    if (this.props.task.Comment) {
      let commentClasses = '';

      if (this.props.task.Comment.Body === '') {
        commentClasses = 'no-display';
      }
      return <div className="ml-2 mr-2">
        <div
          className={`task-comment border border-gray mt-1 ${commentClasses}`}
          ref={(body) => { if (body) { this.body = body; } }} 
          onClick={e => this.editorOpen(e)}
          dangerouslySetInnerHTML={{ __html: this.props.task.Comment.Body }} />
      </div>;
    }
  }

  render() {
    const { isDragging, connectDragSource, connectDragPreview, connectDropTarget,
      isOver, isOverCurrent } = this.props;
    // Create a draggable task button.
    const klass = ['task-unset', 'task-complete', 'task-incomplete'][this.props.task.Status];
    const taskButton_ =
      <button className={`task-status btn btn btn-sm ${klass}`}
          onClick={() => this.cycleStatus()}>
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


    const result = <section className="task" style={style}>
      <div className="task-header d-flex flex-row flex-justify-between pl-1 pr-1">
        <div>
          {taskButton}
        </div>

        <div className="task-controls d-flex">
          {this.hasTime() && <span className="pr-1 tooltipped tooltipped-w"
              aria-label="Average time">
            <span className="octicon octicon-clock "></span>
            {this.props.task.Hours > 0 && `${this.props.task.Hours}h `}
            {this.props.task.Minutes > 0 && `${this.props.task.Minutes}m`}
          </span>}
          {this.hasStreak() && <span className="streak pr-1 ">
            <span className="octicon octicon-dashboard"></span>
            <span>{this.props.task.Streak}/{this.props.task.BestStreak}</span>
            </span>}

          {this.renderControl('Add/edit comment', 'comment', () => this.editorOpen())}  
          {this.props.task.Scope === SCOPE_DAY && 
            this.renderControl('Set time', 'clock', () => this.setTime())}
          {this.hasCopy() &&
            this.renderControl('Copy to the left', 'clippy', () => this.copyLeft())}
          {this.renderControl('Delete task', 'trashcan', () => this.destroy(), true)}  


        </div>

      </div>


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

export const CTaskFactory = React.createFactory(CTask);

// Finally, this method is used to create instances of CTask in a type-checked way

/**
 * Creates an instance of CTask suitable for rendering in an array
 * @param key indice of array loop
 * @param task task data
 */
export const createCTask = (key: number, task: Task) => {
  return CTaskFactory({ key, task } as any);
};

///// SCOPES

/** 
 * Scope presentation element. Made because time-based and project-based scopes have some different
 * functionality */
const PresentScope: React.SFC<{ title: string, addTask: () => void }> = ({ title, addTask,
    children }) => {
  return <section className="scope bg-gray mb-2">
    <div className="scope-header border-bottom d-flex flex-row flex-justify-between">
      <h3 className="pl-2">{title}</h3>
      <div className="scope-controls pr-1 pt-1">
        <common.OcticonButton name="plus" onClick={addTask} tooltip="Add task" />
      </div>
    </div>

    <div className="scope-tasks mt-1">
      {children}
    </div>
  </section>;
};

interface TimeScopeProps {
  currentProject: number;
  currentDate: moment.Moment;
  scope: Scope;
  filter: FilterState;
}

export class TimeScope extends
  React.Component<TimeScopeProps, {}> {
  navigate(method: 'add' | 'subtract') {
    const unit = this.props.scope.Scope === SCOPE_MONTH ? 'month' : 'year';
    const ndate = this.props.currentDate.clone()[method](1, unit);
    route(routeForView(ndate, this.props.currentProject));
  }

  addTask() {
    common.modalPrompt('Enter name:', 'Add new task', (name: string) => {
      if (name) {
        common.post(`/habits/new`, {
          name,
          date: this.props.scope.Date.format('YYYY-MM-DDTHH:mm:ssZ'),
          scope: this.props.scope.Scope,
        });
      }
    });
  }

  render() {
    let filteredTasks = this.props.scope.Tasks;

    // Apply filters
    if (this.props.filter.name) {
      const filterName = this.props.filter.name;
      filteredTasks = filteredTasks.filter((t, i) => {
        return t.Name.toLowerCase().startsWith(filterName.toLowerCase());
      });
    }

    const filterBegin = this.props.filter.begin;
    const filterEnd = this.props.filter.end;

    if (filterBegin || filterEnd) {
      if (filterBegin && filterEnd) {
        filteredTasks = filteredTasks.filter((t, i) =>
          t.Date >= filterBegin && t.Date <= filterEnd);
      } else if (filterBegin) {
        filteredTasks = filteredTasks.filter((t, i) => t.Date >= filterBegin);
      } else if (filterEnd) {
        filteredTasks = filteredTasks.filter((t, i) => t.Date <= filterEnd);
      }
    }

    const tasks = filteredTasks.map((t, i) => {
      return createCTask(i, t);
    });


    const title =
      this.props.scope.Date.format(['', 'dddd Do', 'MMMM', 'YYYY'][this.props.scope.Scope]);
    return <PresentScope title={title} addTask={() => this.addTask()}>
      {...tasks}      
    </PresentScope>;
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
    title={`${recentActivityString} ${p.CompletedTasks} in the last 72 days`} />;
};

export interface ProjectScopeProps {
  currentDate: moment.Moment;
  scope: Scope;
}

export class ProjectScope extends React.PureComponent<ProjectScopeProps, {}> {
  changeProject(e: React.SyntheticEvent<HTMLSelectElement>) {
    e.persist();
    const projectID = parseInt(e.currentTarget.value, 10);

    if (isNaN(projectID)) return;

    route(`view/${this.props.currentDate.format(common.MONTH_FORMAT)}/${projectID}`);
  }

  addTask() {
    common.modalPrompt('Enter task name', 'New task', (name) => {
      if (name) {
        common.post(`/habits/new`, {
          name,
          date: this.props.scope.Date.format('YYYY-MM-DDTHH:mm:ssZ'),
          scope: this.props.scope.Scope,
        });
      }
    });
  }

  render() {
    const tasks = this.props.scope.Tasks.map((t, i) => {
      return createCTask(i, t);
    });

    return <section className="scope bg-gray">
      <div className="scope-header d-flex flex-row flex-justify-between p-1 ">
        <h4 className="scope-title border-bottom ">
          <span><a href={`#view/${this.props.currentDate.format(common.MONTH_FORMAT)}/0`}>
            Projects</a></span> 
          <span> &gt; {this.props.scope.Name}</span></h4>

        <common.OcticonButton name="plus" tooltip="New task" onClick={() => this.addTask()} />
      </div>

      {...tasks}
    </section>;
  }
}

export interface ProjectListProps {
  pinnedProjects: Project[];
  unpinnedProjects: Project[];
  currentDate: moment.Moment;
}

export class ProjectList extends React.PureComponent<ProjectListProps, {}> {
  deleteProject(id: number) {
    common.modalConfirm(
      'Are you sure you want to delete this project?', 'Delete this project!',
      () => {
        common.post(`/habits/projects/delete/${id}`);
      });
  }

  pinProject(p: Project) {
    common.post(`/habits/projects/toggle-pin/${p.ID}`);
  }

  copyLeft(p: Project) {
    const task = {
      Name: p.Name,
      Scope: SCOPE_DAY,
      Date: moment().format('YYYY-MM-DDTHH:mm:ssZ'),
    };

    common.post('/habits/new', task);

  }

  renderProjectLink(project: Project) {
    return <div key={project.ID} className="d-flex flex-row flex-justify-between">
      <div>

        {project.Pinned && projectActivityIcon(project)}

        <a href={urlForView(this.props.currentDate, project.ID)}>{project.Name}</a>
      </div>

      <div className="project-controls">
        <span className="task mr-1"> {/* used for smaller font*/}
          {project.CompletedTasks}
        </span>

        <common.OcticonButton name="clippy" tooltip="Copy to left"
          onClick={() => this.copyLeft(project)} />
        <common.OcticonButton name="pin" tooltip={project.Pinned ? 'Unpin project' : 'Pin project'}
          onClick={() => this.pinProject(project)} />
        <common.OcticonButton name="trashcan" tooltip="Delete project"
          onClick={() => this.deleteProject(project.ID)} />
      </div>
    </div>;
  }

  addProject() {
    common.modalPrompt('New project name', 'Add new project', (name) => {
      if (name) {
        common.post(`/habits/projects/new/${name}`);
      }
    });
  }

  render() {
    return <section className="project-list border bg-gray ">
      <div className="d-flex flex-row flex-justify-between border-bottom scope-header pl-1 pr-1">
        <h2 className="scope-title">Projects</h2>
        <common.OcticonButton name="plus" tooltip="Add new project"
          onClick={() => this.addProject()} />
      </div>
      <div className="pl-1 pr-1 pt-1">
        {this.props.pinnedProjects.map(p => this.renderProjectLink(p))}
      </div>
      <hr className="mt-1 mb-1" />
      <div className="pl-1 pr-1">
        {this.props.unpinnedProjects.map(p => this.renderProjectLink(p))}
      </div>
    </section>;
  }

}

export class HabitsControlBar extends React.PureComponent<HabitsState, {}> {
  navigate(method: 'add' | 'subtract', unit: 'month' | 'year') {
    const ndate = this.props.currentDate.clone()[method](1, unit);
    route(routeForView(ndate, this.props.currentProject));
  }

  filterByName(name: string) {
    dispatch({ name, type: 'FILTER_BY_NAME' });
  }

  filterByDate(end: boolean, date: moment.Moment | null) {
    if (date) {
      dispatch({ date, end, type: 'FILTER_BY_DATE' });
    }
  }

  clearFilter() {
    dispatch({ type: 'FILTER_CLEAR' });
  }

  exportTasks() {
    const name = this.props.filter.name;
    const begin = this.props.filter.begin && this.props.filter.begin.format(common.DAY_FORMAT);
    const end = this.props.filter.end && this.props.filter.end.format(common.DAY_FORMAT);

    const body: any = { day: true };

    if (this.props.filter.name) {
      body.Name = this.props.filter.name;
    }

    if (this.props.filter.begin) {
      body.Begin = this.props.filter.begin.format(common.DAY_FORMAT);
    }

    if (this.props.filter.end) {
      body.End = this.props.filter.end.format(common.DAY_FORMAT);
    }

    common.post('/habits/export', body);
  }

  renderDatePicker(end: boolean, defaultPlaceholder: string,  placeholder?: moment.Moment | null) {
    // TODO: Datepicker onClearable does not work unless a SELECTED value is also apssed
    return <DatePicker 
      className="form-control ml-1 mb-md-0 mb-1"
      onChange={date => this.filterByDate(end, date)}
      isClearable={true}
      placeholderText={placeholder ? placeholder.format(common.DAY_FORMAT) : defaultPlaceholder}
      openToDate={this.props.currentDate} />;
  }

  render() {
    const placeholderBegin = this.props.filter.begin ?
      this.props.filter.begin.format(common.HUMAN_DAY_FORMAT) : 'Filter from...';

    const placeholderEnd = this.props.filter.end ?
      this.props.filter.end.format(common.HUMAN_DAY_FORMAT) : '...to';

    const buttonsDisabled = { disabled: true };

    // If any filters have been entered, we'll render a clear button
    if (this.props.filter.name || this.props.filter.begin || this.props.filter.end) {
      // And if a name and/or a date RANGE have been entered, we'll allow export
      buttonsDisabled['disabled'] = false;
    }

    // tslint:disable-next-line
    return <div id="controls" className="d-flex flex-column flex-md-row flex-items-start flex-justify-between ml-2 mr-2 mt-2 mb-2">
      <div className="d-flex flex-justify-between mb-1">
        <button className="btn mr-1 tooltipped tooltipped-e"
          aria-label="Go back one year"
          onClick={() => this.navigate('subtract', 'year')}>
          <span className="octicon octicon-triangle-left" />
        </button>
        <button className="btn mr-1 tooltipped tooltipped-e"
          aria-label="Go back one month"
          onClick={() => this.navigate('subtract', 'month')}>
          <span className="octicon octicon-chevron-left" />
        </button>
        <button className="btn mr-1 tooltipped tooltipped-e"
          onClick={() => this.navigate('add', 'month')}
          aria-label="Go forward one month">
          <span className="octicon octicon-chevron-right" />
        </button>
        <button className="btn mr-1 tooltipped tooltipped-e"
          aria-label="Go forward one year"
          onClick={() => this.navigate('add', 'year')}>
          <span className="octicon octicon-triangle-right" />
        </button>
        <h2 className="navigation-title ml-1">{this.props.currentDate.format('MMMM YYYY')}</h2>
      </div>


      <div className="d-flex flex-column flex-md-row">
        <input type="text" placeholder="Filter by name" className="form-control mb-md-0 mb-1 ml-"
          onChange={e => this.filterByName(e.target.value)} />

        {this.renderDatePicker(false, 'Filter from...', this.props.filter.begin)}

        {this.renderDatePicker(true, '...to', this.props.filter.end)}

        <button className="btn btn-secondary btn-block ml-1 mb-md-0 mb-1" {...buttonsDisabled}
          onClick={() => this.clearFilter()}>Clear date filter</button>
        <button className="btn btn-primary btn-block ml-1 mb-md-0 mb-1" {...buttonsDisabled}
          onClick={() => this.exportTasks()}>Export selected tasks</button>
      </div>
    </div>;
  }
}

// tslint:disable-next-line:variable-name
export const HabitsRoot = ReactDnd.DragDropContext(HTML5Backend)(
common.connect()(class extends React.PureComponent<HabitsState, {}> {
  /** Render time-based scope (days, months, years) */
  renderTimeScope(s?: Scope, i?: number) {
    if (s) {
      // TODO: Filter by date?
      return <TimeScope currentProject={this.props.currentProject}
        key={i} currentDate={this.props.currentDate} scope={s}
        filter={this.props.filter} />;
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
      <common.CommonUI {...this.props}>
        <HabitsControlBar {...this.props} />
        <div className="d-flex flex-column flex-md-row">
          <div id="habits-scope-daily" className="scope-column">
            {this.props.days ? 
              this.props.days.map((d, i) => this.renderTimeScope(d, i)) :
              <common.Spinner /> }
          </div>
          <div className="scope-column">
            {this.renderTimeScope(this.props.month)}
          </div>
          <div className="scope-column">
            {this.renderTimeScope(this.props.year)}
          </div>
          <div className="scope-column">
            {this.props.pinnedProjects ? this.renderProjects() : <common.Spinner />}
          </div>
        </div>
      </common.CommonUI>
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

      common.setTitle('Habits', `${date.format('MMMM YYYY')}`);
      dispatch({ date, type: 'CHANGE_ROUTE', currentProject: project });

      // Get day scopes
      if (timeChanged === 'CHANGE_YEAR' || timeChanged === 'CHANGE_MONTH') {
        dispatch((dispatch) => {
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

          common.get(qs,
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
        dispatch((dispatch) => {
          common.get(`/habits/in-year?date=${date.format(common.DAY_FORMAT)}`,
          ((tasks: Task[]) => {
            tasks.forEach(common.processModel);
            dispatch({ date, tasks, type: 'MOUNT_SCOPE', scope: SCOPE_YEAR } as HabitsAction);
          }));
        });
      }

      // Retrieve and mount project list
      if (!state.pinnedProjects) {
        dispatch((dispatch) => {
          common.get(`/habits/projects`, ((response:
            { Pinned: Project[], Unpinned: Project[] }) => {
            dispatch({ type: 'PROJECT_LIST', pinnedProjects: response.Pinned,
              unpinnedProjects: response.Unpinned });
          }));
        });
      }

      // Retrieve and mount requested project
      if (projectChanged) {
        dispatch((dispatch) => {
          common.get(`/habits/in-project/${project}`,
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
        dispatch({type: 'UPDATE_TASKS',
          tasks: msg.Datum.Tasks,
        });
        break;

      case 'UPDATE_SCOPE':
        msg.Datum.Tasks.forEach(common.processModel);
        dispatch({type: 'MOUNT_SCOPE', date: moment(msg.Datum.Date, common.DAY_FORMAT),
          scope: msg.Datum.Scope, tasks: msg.Datum.Tasks, name: msg.Datum.Name} as MountScope);
        break;

      case 'PROJECTS':
        dispatch({ type: 'PROJECT_LIST', pinnedProjects: msg.Datum.Pinned,
          unpinnedProjects: msg.Datum.Unpinned});
        break;
    }
  });
  
  ///// RENDER
  common.render('root', store, <HabitsRoot />);
};
