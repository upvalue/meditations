import { GraphQLClient } from 'graphql-request';
import { format, parse } from 'date-fns';

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
  (console.log(scopes), false) ||
  client.request(`{
    tasksByDate(date: "${date}", scopes: [${scopes.join(',')}]) {
      Days {
        ${allDayTaskFields}
      }
      Month {
        ${allTaskFields}
      }
      ${scopes.find(x => x === 'YEAR') !== undefined ?
      `Year { ${allTaskFields} }`
      : ''}
    }
  }`) as Promise<TasksByDateRequest>;

export const updateTask = (task: Partial<Task>) =>
  client.request(`mutation updateTask($taskId: Int!, $task: InputTask!) {
    updateTask(id: $taskId, task: $task) {
      ID, Status
    }
  }`, { task, taskId: task.ID });

export const cycleTaskStatus = (task: Partial<Task>) =>
  updateTask({
    ...task,
    Status: ((task.Status || 0) + 1) % (TaskStatus.STATUS_INCOMPLETE + 1)
  });

/**
 * Format a date in the way the backend expects it, YYYY-MM-DD
 */
export const formatDate = (date: Date) => {
  return format(date, 'yyyy-MM-dd');
}

const baseDate = new Date();

export const parseDate = (date: string) => {
  return parse(date, 'yyyy-MM-dd', baseDate);
}

(window as any).tasksByDate = tasksByDate;
