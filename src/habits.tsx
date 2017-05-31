import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as $ from 'jquery';
import { createStore } from 'redux';
import common from './common';

export interface Task {
  CreatedAt: string;
  UpdatedAt: string;
  DeletedAt: string | null;
  ID: number;
  date: string;
  hours: number | null;
  order: number;
  scope: number;
  name: string;
  // Derived statistics
  best_streak: number | null;
  completed_tasks: number | null;
  completion_rate: number | null;
  total_tasks: number | null;
  total_tasks_with_time: number | null;
}

export interface TaskProps {
  task: Task;
}

export class CTask extends React.Component<{task: Task}, undefined>{
  render() {
    return <p>{this.props.task.name}</p>
  }
}

export class Scope extends React.Component<{tasks: Array<Task>}, undefined> {

}

export class HabitsRoot extends React.Component<{tasks: ReadonlyArray<Task>}, undefined> {
  render() {
    return <div>{this.props.tasks.map((res, i) => <CTask key={i} task={res} />)}</div>;
  }
}

export default (): void => {
  let date = '2017-05';
  let bucket = '0';


  $.getJSON('/habits/in-year?date=2017-01-01', (res:any) => {
    const tasks : Array<Task> = res;
    // Not sure what to do....

    // First thing to do is navigation.

    ReactDOM.render(<HabitsRoot tasks={tasks} />, document.getElementById('habits-root'));
  });
}
// ReactDOM.render(<p>Hello, world</p>, document.getElementById('habits-root'));
