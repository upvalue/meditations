import { readFileSync } from 'fs';
import knex from './knex';

import { NoteRecord, MutationCreateNoteArgs, QueryGetNoteArgs, Note } from '../../shared';
import { ApolloError, UserInputError } from 'apollo-server-express';
import { getNote } from './queries';

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
      return getNote(noteId).then(note => {
        return {
          ...note,
          // If no revision exists, provide an empty body
          body: note.body || '[]',
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
    }
  }
}

console.log(typeDefs);