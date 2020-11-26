import { readFileSync } from 'fs';
import knex from './knex';

import { NoteRecord, MutationCreateNoteArgs, QueryGetNoteArgs, Note, MutationUpdateNoteArgs } from '../../shared';
import { ApolloError, UserInputError } from 'apollo-server-express';
import { getNote, updateNote } from './queries';
import { InvariantError } from './errors';

export const typeDefs = readFileSync('../shared/schema.graphql').toString();

export const resolvers = {
  Query: {
    allNotes: async () => {
      return knex.from('notes').select<NoteRecord[]>('noteId').orderBy('createdAt').then(rows => {
        console.log(rows);
        return rows;
      })
    },

    getNote: async (_parent: any, { noteId }: QueryGetNoteArgs) => {
      return getNote(noteId).then(r => {
        console.log(r);
        return {
          noteId: r.noteId,
          revision: r.noteRevisionId,
          // If no revision exists, provide an empty body
          body: r.body ? JSON.stringify(r.body) : '[]',
        };
      });
    }
  },

  Mutation: {
    createNote: async (_parent: any, { noteId, createdAt }: MutationCreateNoteArgs) => {
      return knex.table('notes').insert({
        noteId,
        createdAt,
        updatedAt: createdAt,
      }).returning('*').then(rows => {
        console.log(rows);
        return rows[0];
      })
    },

    updateNote: async (_parent: any, { noteId, noteRevisionId, updatedAt, body }: MutationUpdateNoteArgs) => {
      // Require that this update specifies the correct revision (corny way of preventing multiple
      // open tabs from writing results)

      return getNote(noteId).then(r => {
        console.log('check note', r);
        // Latest revision not found, this must be first write
        if (typeof r.noteRevisionId !== 'number') {
          if (noteRevisionId !== 0) {
            throw new InvariantError(`Note ${noteId} has no revisions but attempted to write revision ${noteRevisionId}`);
          }
        } else {
          if (noteRevisionId !== r.noteRevisionId + 1) {
            throw new InvariantError(`Note ${noteId} is at revision ${r.noteRevisionId} so next revision should be ${r.noteRevisionId + 1} but attempted to write ${noteRevisionId}`);
          }
        }

        // Revision invariants are OK, write update
        return updateNote(noteId, noteRevisionId, updatedAt, body).then(upd => ({
          noteId: noteId,
          revision: noteRevisionId,
        }));
      }).catch(e => {
        throw e;
      });
    },
  }
}

console.log(typeDefs);