import { ApolloError } from 'apollo-server-express';
import { Note, NoteRecord } from '../../shared';
import { DatabaseError, NotFoundError } from './errors';
// queries.ts - database queries, utilities, intermediary database types

import knex from './knex';

const assertFoundOne = <T>(objectId: string, rows: ReadonlyArray<T>) => {
  const [tipe] = objectId.split('-');

  if (rows.length === 0) {
    throw new NotFoundError(`Could not find ${tipe} ${objectId}`, { objectId });
  }
}

type GetNote = {
  noteId: string,
  noteRevisionId: number,
  body: string,
};

/**
 * Get a note and its latest revision from the database
 * @param noteId 
 */
export const getNote = (noteId: string) => {
  return knex.from('notes')
    .where({ 'notes.noteId': noteId })
    .select('notes.noteId', 'note_revisions.body', 'note_revisions.note_revision_id')
    .leftJoin('note_revisions', 'notes.revision', 'note_revisions.note_revision_id')
    .then((rows: GetNote[]) => {
      assertFoundOne(noteId, rows);

      return rows[0];
    });
}

/**
 * Add a revision to a note
 * @param noteId 
 */
export const updateNote = async (noteId: string, noteRevisionId: number, updatedAt: string, body: string) => {
  const trx = await knex.transaction();

  try {
    await knex.table('note_revisions').transacting(trx).insert({ createdAt: updatedAt, noteId, noteRevisionId, body });

    await knex.table('notes').transacting(trx).where({ noteId }).update({
      noteId,
      revision: noteRevisionId,
      updatedAt: updatedAt,
    });

    trx.commit();
  } catch (e) {
    trx.rollback();
    throw new DatabaseError(e.message);
  };
}