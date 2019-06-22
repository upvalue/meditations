export type Task = {
  id: number;
  name: string;
  minutes: number;
  status: number;
  scope: number;
  date: string;
  comment?: string;
  position: number;
  // Calculated on query
  completion_rate?: number;
  total_tasks?: number;
  completed_tasks?: number;
}

export type TaskPosition = {
  id: number;
  task: Task;
  oldPosition: number;
  oldDate: string;
  newPosition: number;
  newDate: string;
}

export type InputTaskMinutes = {
  id: number;
  minutes: number;
  scope: number;
}

export type InputTaskStatus = {
  id: number;
  status: number;
}

export type InputTaskPosition = {
  id: number;
  date: string;
  position: number;
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

export type TaskPositionEvent = {
  __typename: 'TaskPositionEvent';
  taskPosition: TaskPosition;
}

export type TaskEvent = AddTaskEvent & {
  sessionId: string;
};

// Subscription type, used by useSubscription
export type AddTaskSubscription = {
  addTask: AddTaskEvent,
};

export type TaskSubscription = AddTaskSubscription;