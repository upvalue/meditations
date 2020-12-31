import { readFileSync } from 'fs';
import knex from './knex';

import { NoteRecord, MutationCreateNoteArgs, QueryGetNoteArgs, MutationUpdateNoteArgs, Tag, MutationCreateTagArgs } from '../../shared';
import { getNote, updateNote } from './queries';
import { InvariantError } from './errors';
import { discoverRelations } from './parse';

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
    },

    allTags: async (_parent: any) => {
      return knex.from('tags').select<Tag[]>('*').then(rows => {
        return rows;
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

        const noteBody = JSON.parse(body);

        console.log(noteBody);

        const relations = discoverRelations(noteBody);

        // console.log(`!!! document relations`, relations);

        // Revision invariants are OK, write update
        return updateNote(noteId, noteRevisionId, updatedAt, body).then(upd => ({
          noteId: noteId,
          revision: noteRevisionId,
        }));
      }).catch(e => {
        throw e;
      });
    },

    createTag: async (_parent: any, { tagId, tagName }: MutationCreateTagArgs) => {
      const createdAt = new Date();

      return knex.table('tags').insert({
        tagId,
        tagName,
        createdAt,
      }).returning('*').then(rows => {
        console.log(rows);
        return rows[0];
      });
    }
  }
}

console.log(typeDefs);