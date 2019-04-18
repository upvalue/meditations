// model.ts - database interaction code

import process from 'process';
import sqlite from 'sqlite3';

import Knex = require('knex');

import { lowerCase } from 'lodash';

import { knex } from './database';

export enum Scope {
  UNUSED = 0,
  DAY = 1,
  MONTH = 2,
  YEAR = 3,
  PROJECT = 4,
}

export type Task = {
  id: number;
  created_at: string;
  updated_at?: string;
  deleted_at?: string;
  name: string;
  date: string;
  status: number;
  scope: number;
  position: number;
  minutes: number;
  comment?: string;
};

console.log('Opening database');
const db = new sqlite.Database('./development.sqlite3', (err) => {
  if (err) {
    console.error(`ERROR: Opening database ${err.message}`);
    process.exit(1);
  }
});

const taskFields: { [key: string]: string } = {
  id: 'ID',
  created_at: 'CreatedAt',
  updated_at: 'UpdatedAt',
  name: 'Name',
  date: 'Date',
  status: 'Status',
  scope: 'Scope',
  position: 'Position',
  minutes: 'Minutes',
  comment: 'Comment',
};

/**
 * Select a bunch of rows from the database
 */
const dbSelect = <T extends {}>(query: string, params?: { [key: string]: any }):
  Promise<ReadonlyArray<T>> => {
  return new Promise<ReadonlyArray<T>>((resolve, reject) => {
    console.log(`QUERY: ${query}`);
    console.log(params);
    db.all(query, params || {}, (err, rows) => {
      if (err) {
        console.error(`ERROR: database: ${err.message}`);
        reject(err);
      } else {
        resolve(rows as ReadonlyArray<T>);
      }
    });
  });
};

export const tasksInScope = (date: string, scopes: number[]): Promise<ReadonlyArray<Task>> => {
  return knex.from('tasks')
    .select('id', 'created_at', 'updated_at', 'name', 'date', 'status', 'scope', 'position', 'minutes', 'comment')
    .where('date', 'like', `${date}%`)
    .whereIn('scope', scopes)
    .whereNull('deleted_at')
    .orderBy('position') as any as Promise<ReadonlyArray<Task>>;
}


/*
export const updateTask = ($taskId: number, task: Partial<Task>) => {
  return new Promise<ReadonlyArray<Task>>((resolve, reject) => {
    // Automatically generate set statement with only relevant fields
    const setFields = Object.keys(task).map(k => `${lowerCase(k)} = $${k}`).join(',');
    const setParams: { [key: string]: any } = { $taskId };
    Object.keys(task).forEach(k => {
      setParams[`$${k}`] = (task as any)[k];
    });

    // Do the thing
    db.run(`UPDATE tasks SET ${setFields} WHERE id = $taskId`, setParams, (err) => {
      if (err) {
        reject(err);
      } else {
        dbSelect<Task>(
          `SELECT ${selectAll} FROM tasks WHERE id IN ($taskIds)`,
          { $taskIds: [$taskId].join(',') })
          .then((res) => {
            console.log(res);
            resolve(res);
          });
      }
    });
  });
};
*/

export default db;
