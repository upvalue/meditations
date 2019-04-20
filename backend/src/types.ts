export type Task = {
  id: number;
  name: string;
  minutes: number;
  status: number;
  scope: number;
  date: string;
  comment?: string;
  // Calculated on query
  completion_rate?: number;
  total_tasks?: number;
  completed_tasks?: number;
}

export type InputTaskMinutes = {
  id: number;
  minutes: number;
  scope: number;
}

export type InputTaskNew = {
  name: string;
  date: string;
  scope: string;
}

export type UpdatedTasksEvent = {
  __typename: 'UpdatedTasksEvent';
  updatedTasks: ReadonlyArray<Task>;
}

export type AddTaskEvent = {
  __typename: 'AddTaskEvent';
  newTask: Task;
}

export type TaskEvent = UpdatedTasksEvent | AddTaskEvent;