// task.tsx - Task components

import * as React from 'react';
import * as ReactDnd from 'react-dnd';
import * as moment from 'moment';

import * as common from '../common';
import { OcticonButton, Editable } from '../common/components';

import { Status, Task, ScopeType, Scope } from './state';
import { MOUNT_NEXT_DAY_TIME } from './main';

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
    if (!this.body) return false;
    return !this.props.task.Comment || this.body.innerHTML !== this.props.task.Comment.Body;
  }

  editorSave() {
    if (!this.body) return;
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
 * @param task task data
 */
export const createCTask = (task: Task, lastModifiedTask?: string) => {
  return CTaskFactory({ task, key: task.ID, lastModified: task.Name === lastModifiedTask } as any);
};
