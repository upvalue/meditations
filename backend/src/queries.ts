import { ApolloError } from 'apollo-server-express';
import { Note } from '../../shared';
// queries.ts - database queries, utilities, intermediary database types

import knex from './knex';

export class NotFound extends ApolloError {
  constructor(message: string, properties?: { [key: string]: any }) {
    super(message, "NOT_FOUND", properties);
    Object.defineProperty(this, "name", { value: 'NotFound' });
  }
}

const assertFoundOne = <T>(objectId: string, rows: ReadonlyArray<T>) => {
  const [tipe] = objectId.split('-');

  if (rows.length === 0) {
    throw new NotFound(`Could not find ${tipe} ${objectId}`, { objectId });
  }
}

/**
 * Get a note and its latest revision from the database
 * @param noteId 
 */
export const getNote = (noteId: string) => {
  return knex.from('notes')
    .where({ 'notes.noteId': noteId })
    .select('notes.noteId', 'note_revisions.body')
    .leftJoin('note_revisions', 'notes.revision', 'note_revisions.note_revision_id')
    .then((rows: Note[]) => {
      assertFoundOne(noteId, rows);

      return rows[0];
    });
}