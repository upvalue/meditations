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

  console.log('hot diggity dog');
  // Fetch the record for this tasks
  const oldTask = await knex.table('tasks')
    .select(['id', 'name', 'date', 'position'])
    .where({ id })
    .whereNull('deleted_at')
    .orderBy('position')
    .first();

  const oldPosition = oldTask.position;
  const oldDate = oldTask.date;

  // Fetch the record for the task's current scope
  let prevScope = await knex.table('tasks')
    .select(['id', 'name', 'date', 'position'])
    .where({ date: oldTask.date })
    .whereNull('deleted_at')
    .orderBy('position');

  const withinSameScope = oldTask.date === date;

  // Fetch the record for the task's new scope, or
  // just re-use the previous query if it is the same
  let newScope = withinSameScope ?
    prevScope : await knex.table('tasks')
      .select(['id', 'name', 'date', 'position'])
      .where({ date })
      .whereNull('deleted_at')
      .orderBy('position');

  // Remove task from old scope and splice into new scope
  prevScope = prevScope.filter((t: Task) => t.id !== id);

  // Remove task from new scope if this is same scope
  if (withinSameScope) {
    newScope = newScope.filter((t: Task) => t.id !== id);
  }

  newScope.splice(position, 0, { id, position, date });

  // Now update everything in place
  await Promise.all(newScope.map((t: Task, position: number) => {
    return knex.table('tasks')
      .where({ id: t.id })
      .update({ date: t.date, position: position });
  }));

  if (!withinSameScope) {
    console.log('update old scope');
    await Promise.all(prevScope.map((t: Task, position: number) => {
      console.log(t.id, position);
      return knex.table('tasks')
        .where({ id: t.id })
        .update({ position: position });
    }));
  }

  const task = await knex.table('tasks')
    .select(...taskFields)
    .where({ id })
    .first();


  return { id, task, oldPosition, oldDate, newDate: date, newPosition: position };
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