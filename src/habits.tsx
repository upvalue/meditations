import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as $ from 'jquery';

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

export class CTask extends React.Component<TaskProps, undefined>{
  render() {
    return <p>{this.props.task.name}</p>
  }
}

export interface CHabitsRootProps {
  name:string;
}

export class CHabitsRoot extends React.Component<{tasks: ReadonlyArray<Task>}, undefined> {
  render() {
    return <div>{this.props.tasks.map((res, i) => <CTask key={i} task={res} />)}</div>;
  }
}

export default (): void => {
  $.getJSON('/habits/in-year?date=2017-01-01', (res:any) => {
    const tasks : ReadonlyArray<Task> = res;
    //const tasks : ReadonlyArray<Task> = <Array<Task>>(res);
    //console.log(tasks);
    ReactDOM.render(<CHabitsRoot tasks={tasks} />, document.getElementById('habits-root'));
  });
}
// ReactDOM.render(<p>Hello, world</p>, document.getElementById('habits-root'));
