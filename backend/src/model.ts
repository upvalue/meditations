// model.ts - database interaction code

import process from 'process';
import sqlite from 'sqlite3';

import { knex } from './database';
import { Task, InputTaskMinutes, InputTaskNew, InputTaskStatus } from './types';

export enum Scope {
  UNUSED = 0,
  DAY = 1,
  MONTH = 2,
  YEAR = 3,
  PROJECT = 4,
}

const taskFields = [
  'id', 'created_at', 'updated_at', 'name', 'date', 'status', 'scope', 'position', 'minutes', 'comment'
]

export const tasksInScope = (date: string, scopes: number[]): Promise<ReadonlyArray<Task>> => {
  return knex.from('tasks')
    .select(...taskFields)
    .where('date', 'like', `${date}%`)
    .whereIn('scope', scopes)
    .whereNull('deleted_at')
    .orderBy('position') as any as Promise<ReadonlyArray<Task>>;
}

/**
 * Select tasks related to a daily-scoped task (month and year) if they exist
 * @param name 
 */
export const selectRelatedTasks = (id: number, date: string, name: string) => {
  return knex.table('tasks')
    .select(...taskFields)
    .where({ id })
    .orWhere('scope', 2)
    .whereRaw(`strftime("%Y-%m", date) = strftime("%Y-%m", ?)`, [date])
    .where({ name });
}

export const addTask = async (input: InputTaskNew): Promise<Task> => {
  const { name, date, scope } = input;

  return knex('tasks')
    .insert({
      name, date, scope
    })
    .then(([id]: [number]) =>
      knex.from('tasks')
        .select(...taskFields)
        .where({ id }));

}

/**
 * Update arbitrary fields on a task by ID, then return all relevant
 * updated tasks
 * @param input Partial task object
 */
export const updateTask = async (id: number, fields: any): Promise<ReadonlyArray<Task>> => {
  const [{ scope, date, name }] = await knex.table('tasks')
    .select(['scope', 'date', 'name'])
    .where({ id });

  return knex.table('tasks')
    .where({ id })
    .update(fields)
    .then(res => {
      // Updates to daily tasks may cause other scopes to update,
      // return those updated tasks.
      if (scope === 1) {
        return selectRelatedTasks(id, date, name);
      }

      return knex.from('tasks')
        .select(...taskFields)
        .where({ id }) as any as Promise<ReadonlyArray<Task>>;
    }) as any as Promise<ReadonlyArray<Task>>;
}

export const updateTaskStatus = async (input: InputTaskStatus) => {
  return updateTask(input.id, { status: input.status });
}

/**
 * Update task minutes
 * @param input 
 */
export const updateTaskMinutes = async (input: InputTaskMinutes): Promise<ReadonlyArray<Task>> => {
  const { id, minutes } = input;

  const [{ scope, date, name }] = await knex.table('tasks')
    .select(['scope', 'date', 'name'])
    .where({ id });

  return knex.table('tasks')
    .where({ id })
    .update({ minutes })
    .then(res => {
      if (scope === 1) {
        return selectRelatedTasks(id, date, name);
      }

      return knex.from('tasks')
        .select(...taskFields)
        .where({ id }) as any as Promise<ReadonlyArray<Task>>;
    }) as any as Promise<ReadonlyArray<Task>>;
}