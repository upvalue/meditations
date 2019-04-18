import { GraphQLClient } from 'graphql-request';
import { format, parse } from 'date-fns';

import { Task } from './types';

export * from './types';

import { request } from './request';

const client = new GraphQLClient('/graphql');

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

const allDayTaskFields = 'id, name, scope, status, comment, date, minutes';
const allTaskFields = `${allDayTaskFields}`;

/**
 * Query tasks within a date scope (e.g. all tasks for a given month)
 * @param date Date. YYYY-MM-DD.
 * @param includeYear If true, will query for year
 */
export const tasksByDate = (date: string, includeYear: boolean) =>
  client.request(`{
    tasksByDate(date: "${date}", includeYear: ${includeYear}) {
      Days {
        ${allDayTaskFields}
      }
      Month {
        ${allTaskFields}
      }
      ${includeYear ? `Year { ${allTaskFields} }` : ''}
    }
  }`) as Promise<TasksByDateRequest>;

/**
 * Query tasks within a date scope (e.g. all tasks for a given month)
 * @param date Date. YYYY-MM-DD.
 * @param includeYear If true, will query for year
 */
export const tasksInMonth = (date: string) =>
  client.request(`{
    tasksInMonth(date: "${date}") {
      ${allTaskFields}
    }
  }`) as Promise<TasksInMonthRequest>;

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
