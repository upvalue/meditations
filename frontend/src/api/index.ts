import { format, parse } from 'date-fns';

import { Task } from './types';
import { request } from './request';
export { SESSION_ID } from './request';

export * from './types';

export enum TaskStatus {
  STATUS_UNSET = 0,
  STATUS_COMPLETE = 1,
  STATUS_INCOMPLETE = 2
}

export interface TasksByDateRequest {
  tasksByDate: {
    Days: ReadonlyArray<Task>;
    Month: ReadonlyArray<Task>;
    Year: ReadonlyArray<Task>;
  };
}

export interface TasksInMonthRequest {
  tasksInMonth: ReadonlyArray<Partial<Task>>;
}

/**
 * Fragment to retrieve all task fields
 */
export const taskFieldsFragment = `
fragment taskFields on Task {
  id, name, scope, status, comment, date, minutes, position
}
`;

/**
 * Query tasks within a date scope (e.g. all tasks for a given month)
 * @param date Date. YYYY-MM-DD.
 * @param includeYear If true, will query for year
 */
export const tasksByDate = (date: string, includeYear: boolean) =>
  request(`query tasksByDate($date: String!, $includeYear: Boolean!) {
    tasksByDate(date: $date, includeYear: $includeYear) {
      Days {
        ...taskFields
      }
      Month {
        ...taskFields
      }
      ${includeYear ? `Year { ...taskFields }` : ''}
    }
  }`, [taskFieldsFragment], { date, includeYear }) as Promise<TasksByDateRequest>;

export const baseDate = new Date();

/**
 * Format a date in the way the backend expects it, YYYY-MM-DD
 */
export const formatDate = (date: Date) => {
  return format(date, 'yyyy-MM-dd');
}

export const parseDate = (date: string) => {
  return parse(date, 'yyyy-MM-dd', baseDate);
}