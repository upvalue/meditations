// components.tsx -- habits components
import * as moment from 'moment';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as redux from 'redux';
import * as ReactDnd from 'react-dnd';
import DatePicker from 'react-datepicker';
import HTML5Backend from 'react-dnd-html5-backend';
import route from 'riot-route';
import * as Scroll from 'react-scroll';

import * as common from '../common';
import { OcticonButton, TimeNavigator, Editable, CommonUI, Spinner } from '../common/components';

import { ScopeType, FilterState, Status, Scope, Project, Task, store, dispatch, HabitsState, Day,
  MountScope, dispatchProjectListUpdate }
  from './state';
import { routeForView, urlForView, MOUNT_NEXT_DAY_TIME } from './main';

// TODO: Create a higher-level drag/drop component which contains task, for the sake of testing

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
  lastModified: boolean;
}

// Drag and drop implementation details
const taskSource: ReactDnd.DragSourceSpec<TaskProps> = {
  beginDrag: (props: TaskProps) => {
    // Make the task data available when this task is dropped
    return {
      task: props.task,
    };
  },

};

/** Check whether a given task is in the same scope as another task */
const taskSameScope = (left: Task, right: Task) => {
  if (left.Scope !== right.Scope) {
    return false;
  }

  // If task is part of the same project, then date is irrelevant
  if (left.Scope >= ScopeType.PROJECT) {
    return true;
  }

  // It is possible for tasks to have different Dates and still be in the same scope, e.g.
  // one yearly task has been created in January, the other in February, and thus their dates are
  // different.
  let fmt = '';
  switch (left.Scope) {
    case ScopeType.DAY: fmt = 'YYYY-MM-DD';
    case ScopeType.MONTH: fmt = 'YYYY-MM';
    case ScopeType.YEAR: fmt = 'YYYY';
  }

  return left.Date.format(fmt) === right.Date.format(fmt);
};

const taskTarget: ReactDnd.DropTargetSpec<TaskProps> = {
  drop(props, monitor, component) {

    if (component && monitor) {
      const src = (monitor.getItem() as any).task;
      const target = props.task;

      // Do not allow dropping on self
      if (src.ID === target.ID) {
        return;
      }


      // Task dropped on task in same scope; trigger a re-order
      if (taskSameScope(src, target)) {
        common.post(`/habits/reorder/${src.ID}/${target.ID}`);
        return;
      }

      // Task dropped on task in different scope: move the task
      common.post(`/habits/reorder/${src.ID}/${target.ID}`);

      // TODO: Possibly, this should copy rather than reorder if task scopes are different.
      return;
    }
  },
};

/**
 * Component representing a task.
 * This is decorated immediately after using react-dnd methods;
 * for some reason using them directly as decorators fails.
 */
export class CTaskImpl extends Editable<TaskProps> {
  cycleStatus() {
    const task = { ...this.props.task, Status: (this.props.task.Status + 1) % Status.WRAP };
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
        const task = { ...this.props.task, Minutes: minutes + (hours * 60) };
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
    if (scope === ScopeType.DAY) {
      date.date(moment().clone().add(MOUNT_NEXT_DAY_TIME, 'hour').date());
    } else if (scope === ScopeType.MONTH) {
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
    return this.props.task.Minutes > 0;
  }

  renderTime() {
    let minutes = this.props.task.Minutes;
    const hours = Math.floor(minutes / 60);
    minutes = minutes % 60;

    let string = '';
    if (hours > 0) {
      string += `${hours}h `;
    } 
    if (minutes > 0) {
      string += `${minutes}m`;
    }

    return string.trim();
  }

  hasStreak() {
    return this.props.task.Streak > 0 || this.props.task.BestStreak > 0;
  }

  hasCopy() {
    // Copy only functions on month/year scopes
    if (!(this.props.task.Scope === ScopeType.MONTH || this.props.task.Scope === ScopeType.YEAR)) {
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
    return <OcticonButton tooltip={tip} name={icon} onClick={callback} 
      className="pl-1 flex-self-end" />;
  }

  renderComment() {
    if (this.props.task.Comment) {
      let commentClasses = '';

      if (this.props.task.Comment.Body === '') {
        commentClasses = 'no-display';
      }

      return <div className={`ml-2 mr-2`}>
        <div
          className={`task-comment border border-gray mt-1 ${commentClasses}`}
          ref={(body) => { if (body) { this.body = body; } }} 
          onClick={e => this.editorOpen(e)}
          dangerouslySetInnerHTML={{ __html: this.props.task.Comment.Body }} />
      </div>;
    }
  }

  render() {
    const lastModified = this.props.lastModified ? 'task-last-modified' : '';
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

    const result = <section className={`task ${lastModified}`} style={style}>
      <div className="task-header d-flex flex-row flex-justify-between pl-1 pr-1">
        <div>
          {taskButton}
        </div>

        <div className="task-controls d-flex">
          {this.hasTime() && <span className="pr-1 tooltipped tooltipped-w"
              aria-label="Average time">
            <span className="octicon octicon-clock "></span>
            {this.renderTime()}
          </span>}
          {this.hasStreak() && <span className="streak pr-1 ">
            <span className="octicon octicon-dashboard"></span>
            <span>{this.props.task.Streak}/{this.props.task.BestStreak}</span>
            </span>}

          {this.renderControl('Add/edit comment', 'comment', () => this.editorOpen())}  
          {this.props.task.Scope === ScopeType.DAY && 
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
export const createCTask = (key: number, task: Task, lastModifiedTask?: string) => {
  return CTaskFactory({ key, task, lastModified: task.Name === lastModifiedTask } as any);
};

///// SCOPES

/** 
 * Scope presentation element. Made because time-based and project-based scopes have some different
 * functionality
 */
const PresentScope: React.SFC<{ title: string, addTask: () => void }> = ({ title, addTask,
    children }) => {
  return <section className="scope bg-gray mb-2">
    <div className="scope-header border-bottom d-flex flex-row flex-justify-between">
      <h3 className="pl-2">{title}</h3>
      <div className="scope-controls pr-1 pt-1 ">
        <OcticonButton className="" name="plus" onClick={addTask}
          tooltip="Add task" />
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
  lastModifiedTask: string;
}

export class TimeScope extends
  React.Component<TimeScopeProps> {
  navigate(method: 'add' | 'subtract') {
    const unit = this.props.scope.Scope === ScopeType.MONTH ? 'month' : 'year';
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
      return createCTask(i, t, this.props.lastModifiedTask);
    });


    const title =
      this.props.scope.Date.format(['', 'dddd Do', 'MMMM', 'YYYY'][this.props.scope.Scope]);
    return <PresentScope title={title} addTask={() => this.addTask()}>
      {...tasks}      
    </PresentScope>;
  }
}

/** Returns project activity indicator */
const projectActivityIcon = (p: Project, days: number) => { 
  const projectActivityClass = Math.min(p.CompletedTasks, 23);

  return <span className={`octicon octicon-flame project-activity-${projectActivityClass}`}
    title={`${p.CompletedTasks} in the last ${days} days`} />;
};

export interface ProjectScopeProps {
  currentDate: moment.Moment;
  scope: Scope;
  projectStatsDays: number;
}

export class ProjectScope extends React.PureComponent<ProjectScopeProps> {
  changeProject(e: React.SyntheticEvent<HTMLSelectElement>) {
    e.persist();
    const projectID = parseInt(e.currentTarget.value, 10);

    if (isNaN(projectID)) return;

    route(`view/${this.props.currentDate.format(common.MONTH_FORMAT)}/${projectID}`);

    this.addTask = this.addTask.bind(this);
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
        <h3 className="scope-title border-bottom ">
          <span><a href={`#view/${this.props.currentDate.format(common.MONTH_FORMAT)}/0`}>
            Projects</a></span> 
          <span> &gt; {this.props.scope.Name}</span></h3>

        <OcticonButton className="flex-self-center" name="plus"
          tooltip="New task" onClick={this.addTask} />
      </div>

      {...tasks}
    </section>;
  }
}

export interface ProjectListProps {
  pinnedProjects: Project[];
  unpinnedProjects: Project[];
  projectStatsDays: number;
}

export class ProjectList extends React.PureComponent<ProjectListProps> {
  projectStatsDaysInput: HTMLInputElement;

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
      Scope: ScopeType.DAY,
      Date: moment().format('YYYY-MM-DDTHH:mm:ssZ'),
    };

    common.post('/habits/new', task);
  }

  renderProjectLink(project: Project) {
    const hours = Math.floor(project.Minutes / 60);
    const minutes = project.Minutes % 60;
    return <div key={project.ID} className="d-flex flex-row flex-justify-between">
      <div>

        {project.Pinned && projectActivityIcon(project, this.props.projectStatsDays)}

        <a href={urlForView('current', project.ID)}>{project.Name}</a>
      </div>

      <div className="project-controls">
        {(project.CompletedTasks > 0) && 
          <span className="mr-1 tooltipped tooltipped-w" aria-label="Completed tasks"> 
            <span className="octicon octicon-check" />
            {project.CompletedTasks}
          </span>}

        {(hours > 0 || minutes > 0) &&
          <span className="mr-1 tooltipped tooltipped-w" aria-label="Time">
            <span className="octicon octicon-clock" />
            {hours > 0 && `${hours}h${minutes > 0 ? ' ' : ''}`}
            {minutes > 0 && `${minutes}m`}
          </span>}

        <OcticonButton name="clippy" tooltip="Copy to left"
          onClick={() => this.copyLeft(project)} />
        <OcticonButton name="pin" tooltip={project.Pinned ? 'Unpin project' : 'Pin project'}
          onClick={() => this.pinProject(project)} />
        <OcticonButton name="trashcan" tooltip="Delete project"
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

  /** Calculate stats from the beginning of the year */
  statsFromStartOfYear() {
    const days = moment().diff(moment().startOf('year'), 'days');
    dispatchProjectListUpdate(days);
  }

  statsFromForever() {
    dispatchProjectListUpdate(365 * 30);
  }

  statsFromInput() {
    const n = parseInt(this.projectStatsDaysInput.value, 10);
    if (!isNaN(n)) {
      dispatchProjectListUpdate(n);
    }
  }

  render() {
    return <section className="project-list border bg-gray ">
      <div className="d-flex flex-row flex-justify-between border-bottom scope-header pl-1 pr-1">
        <h3 className="scope-title">Projects</h3>
        <div className="scope-controls pr-1 pt-1 flex-self-center">
          <OcticonButton name="plus" tooltip="Add new project" 
            onClick={() => this.addProject()} />
        </div>
      </div>
      <div className="pl-1 pr-1 pt-1">
        {this.props.pinnedProjects.map(p => this.renderProjectLink(p))}
      </div>
      <hr className="mt-1 mb-1" />
      <div className="pl-1 pr-1">
        {this.props.unpinnedProjects.map(p => this.renderProjectLink(p))}
      </div>
      <hr className="mt-1 mb-1" />
      <div className="pl-1 pr-1 pt-1 pb-1">
        <div className="d-flex flex-row flex-justify-between">
          <div>
            Showing stats for last <button className="btn btn-sm ">
              {this.props.projectStatsDays}
            </button> days
          </div>
          <div>
            <input ref={(ref) => { if (ref) this.projectStatsDaysInput = ref; }}
              type="text" size={2} placeholder="72" className="mr-1 form-control"
              onBlur={() => this.statsFromInput()} />
            <button className="btn btn-sm btn-secondary mr-1"
              onClick={() => this.statsFromStartOfYear()}>
              Start of year
            </button>
            <button className="btn btn-sm btn-secondary"
              onClick={() => this.statsFromForever()}>
              Forever
            </button>
          </div>
        </div>
      </div>
    </section>;
  }
}

export class HabitsControlBar extends React.PureComponent<HabitsState> {
  constructor(props: HabitsState) {
    super(props);
    this.navigate = this.navigate.bind(this);
    this.navigatorRoute = this.navigatorRoute.bind(this);
  }

  /** Callback that gives page-appropriate routes to TimeNavigator */
  navigatorRoute(method: 'add' | 'subtract' | 'reset', unit?: 'month' | 'year' | 'day') {
    if (method === 'reset') {
      return routeForView(moment(), this.props.currentProject);
    } else if (unit) {
      const ndate = this.props.currentDate.clone()[method](1, unit);
      return routeForView(ndate, this.props.currentProject);
    }
  }

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
    // Build up a descriptive filename along with the POST body
    let filename = '';

    // Add task name, if available
    if (this.props.filter.name) {
      body.Name = this.props.filter.name;
      filename += `-${this.props.filter.name}`;
    }

    // Add description of date, if available
    if (this.props.filter.begin) {
      body.Begin = this.props.filter.begin.format(common.DAY_FORMAT);
      filename += `-from-${this.props.filter.begin.format(common.DAY_FORMAT)}`;
    }

    if (this.props.filter.end) {
      body.End = this.props.filter.end.format(common.DAY_FORMAT);
      filename += `-to-${this.props.filter.end.format(common.DAY_FORMAT)}`;
    }

    common.post('/habits/export', body, (res: any) => {
      const elt = document.createElement('a');
      elt.setAttribute('href', `data:text/plain;charset=utf-8,${encodeURIComponent(res.body)}`);
      elt.setAttribute('download', `meditations-export${filename}.txt`);
      elt.style.display = 'none';
      document.body.appendChild(elt);
      elt.click();
      document.body.removeChild(elt);
    });
  }

  renderDatePicker(end: boolean, defaultPlaceholder: string,  value?: moment.Moment | null) {
    // TODO: Datepicker onClearable does not work unless a SELECTED value is also passed
    return <DatePicker 
      className="form-control ml-1 mb-md-0 mb-1"
      onChange={date => this.filterByDate(end, date)}
      isClearable={true}
      placeholderText={defaultPlaceholder}
      value={value ? value.format(common.DAY_FORMAT) : ''}
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
    return <div id="controls" className="d-flex flex-column flex-md-row flex-items-start flex-justify-between ml-3 mr-2 mt-2 mb-2">
      <TimeNavigator daysOnly={false} getRoute={this.navigatorRoute} currentDate={this.props.currentDate}  />

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

/**
 * A menu for easy navigation between scopes on mobile devices
 */
class HabitsMobileMenu extends React.PureComponent<{}, {opened: boolean}> {
  constructor(props: {}) {
    super(props);
    this.state = { opened: false };
  }

  toggle() {
    this.setState({ opened: !this.state.opened });
  }

  renderLink(name:string, text: string) {
    // NOTE: activeClass doesn't work here when there are not many tasks as 
    // the month/year/projects scope may fit into the screen without going past the day tasks
    return <Scroll.Link to={name} smooth={true} duration={500} spy={true}
      onClick={() => this.toggle()}
      className="menu-item" >
      {text}
    </Scroll.Link>;
  }

  render() {
    return <div id="mobile-menu" className="d-flex flex-column">
      <OcticonButton name="three-bars" tooltip="Toggle mobile menu"  octiconClass=""
        className="flex-self-end mb-1"
        onClick={() => this.toggle()} />
      {this.state.opened && 
        <nav className="menu" id="mobile-menu-nav">
          {this.renderLink('scope-days', 'Day')}
          {this.renderLink('scope-month', 'Month')}
          {this.renderLink('scope-year', 'Year')}
          {this.renderLink('scope-projects', 'Projects')}
        </nav>
      }
    </div>;
  }

}

// tslint:disable-next-line:variable-name
export const HabitsRoot = ReactDnd.DragDropContext(HTML5Backend)(
common.connect()(class extends React.PureComponent<HabitsState> {
  /** Render time-based scope (days, months, years) */
  renderTimeScope(s?: Scope, i?: number) {
    if (s) {
      // TODO: Filter by date?
      return <TimeScope currentProject={this.props.currentProject}
        key={i} currentDate={this.props.currentDate} scope={s}
        filter={this.props.filter} lastModifiedTask={this.props.lastModifiedTask} />;
    } else {
      return <Spinner />;
    }
  }

  /** Render either a list of projects or the currently open project */
  renderProjects() {
    if (this.props.currentProject === 0) {
      return <ProjectList 
        pinnedProjects={this.props.pinnedProjects}
        unpinnedProjects ={this.props.unpinnedProjects}
        projectStatsDays={this.props.projectStatsDays} />;
    } else {
      if (this.props.project && this.props.currentProject === this.props.project.Scope) {
        return <ProjectScope  currentDate={this.props.currentDate} scope={this.props.project}
          projectStatsDays={this.props.projectStatsDays} />;
      } else {
        // In case the route has changed, but the project data has not been loaded yet.
        return <Spinner />;
      }
    }
  }

  render() {
    return <div id="habits-root-sub">
      <CommonUI {...this.props}>
        <HabitsControlBar {...this.props} />
        <HabitsMobileMenu />
        <div className="d-flex flex-column flex-md-row">
          <div id="scope-days" className="scope-column mr-md-1">
            {this.props.days ?  
              this.props.days.map((d, i) => this.renderTimeScope(d, i)) :
              <Spinner /> }
          </div>
          <div id="scope-month" className="scope-column mr-md-1">
            {this.renderTimeScope(this.props.month)}
          </div>
          <div id="scope-year" className="scope-column mr-md-1">
            {this.renderTimeScope(this.props.year)}
          </div>
          <div id="scope-projects" className="scope-column">
            {this.props.pinnedProjects ? this.renderProjects() : <Spinner />}
          </div>
        </div>
      </CommonUI>
    </div>;
  }
}));
