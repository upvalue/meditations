// model.ts - database interaction code

import { knex } from './database';
import { Task, InputTaskMinutes, InputTaskNew, InputTaskStatus, InputTaskPosition } from './types';

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

export const tasksInMonth = (date: string): Promise<ReadonlyArray<Task>> => {
  return knex.from('tasks')
    .select(...taskFields)
    .whereNull('deleted_at')
    .whereRaw(`strftime("%Y-%m", date) = ?`, [date]) as any as Promise<ReadonlyArray<Task>>;
}

export const tasksInScope = (date: string): Promise<ReadonlyArray<Task>> => {
  return knex.from('tasks')
    .select(...taskFields)
    .where('date', '=', `${date}`)
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

  // Find position of new task
  const [taskPosition] = await knex('tasks')
    .where({ date })
    .count();

  const position = taskPosition['count(*)'];

  return knex('tasks')
    .insert({
      name, date, scope, position
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

export const updateTaskPosition = async (input: InputTaskPosition) => {
  const { id, date, position } = input;

  const oldTasks = await knex.table('tasks')
    .select(['id', 'name', 'date', 'position'])
    .where({ date })
    .whereNull('deleted_at')
    .orderBy('position');

  const oldTask = oldTasks.find((t: Task) => t.id === input.id);

  // If task has been ordered within same scope, remove from array and then add
  if (oldTask.date === date) {
    let newTasks = oldTasks
      .filter((t: Task) => t.id !== id);

    newTasks.splice(position, 0, { id, position });

    newTasks = newTasks.map((t: Task, i: number) => ({ ...t, position: i }));

    // Now update in place
    await Promise.all(newTasks.map((t: Task) => {
      console.log({ id: t.id }, { position: t.position });
      return knex.table('tasks')
        .where({ id: t.id })
        .update({ position: t.position });
    }));
    // Update task list and return... something

  }


  // To reorder task

  // Select all tasks from current scope, remove task by filter
  // If scope equal, insert and save all, otherwise:
  // Select all tasks from new scope, remove task by filter, insert new task
  // Update position of all tasks in scope using ORDER BY

  // Returned -- new position only or maybe task data too?
  // Just positions right


  // console.log('move from', task, 'to', date, position);
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