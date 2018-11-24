import { GraphQLClient } from 'graphql-request';

const client = new GraphQLClient('/graphql');

export enum TaskStatus {
  STATUS_UNSET = 0,
  STATUS_COMPLETE = 1,
  STATUS_INCOMPLETE = 2
}

export type RequestScopeEnum = 'MONTH' | 'DAYS' | 'YEAR';

export interface Task {
  ID: number;
  Name: string;
  Minutes: number;
  Status: number;
  // Calculated on query
  CompletionRate?: number;
  TotalTasks?: number;
  CompletedTasks?: number;
}

export interface TasksByDateRequest {
  tasksByDate: {
    Days: ReadonlyArray<Partial<Task>>;
    Month: ReadonlyArray<Partial<Task>>;
    Year: ReadonlyArray<Partial<Task>>;
  };
}

const allDayTaskFields = 'ID, Name, Scope, Status';
const allTaskFields = `${allDayTaskFields}, CompletionRate, TotalTasks, CompletedTasks`;

/**
 * Query tasks within a date scope (e.g. all tasks for a given month)
 * @param date Date. YYYY-MM-DD.
 * @param scopes MONTH, YEAR, DAYS (query all days within month)
 */
export const tasksByDate = (date: string, scopes: ReadonlyArray<RequestScopeEnum>) =>
  client.request(`{
    tasksByDate(date: "${date}", scopes: [${scopes.join(',')}]) {
      Days {
        ${allDayTaskFields}
      }
      Month {
        ${allTaskFields}
      }
      Year {
        ${allTaskFields}
      }
    }
  }`) as Promise<TasksByDateRequest>;

export const updateTask = (task: Partial<Task>) =>
  client.request(`mutation updateTask($taskId: Int!, $task: InputTask!) {
    updateTask(ID: $taskId, task: $task) {
      ID, Status
    }
  }`, { task, taskId: task.ID });

export const cycleTaskStatus = (task: Partial<Task>) =>
  updateTask({
    ...task,
    Status: ((task.Status || 0) + 1) % (TaskStatus.STATUS_INCOMPLETE + 1)
  });

(window as any).tasksByDate = tasksByDate;
