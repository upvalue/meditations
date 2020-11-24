import { readFileSync } from 'fs';
import knex from './knex';

import { NoteRecord, MutationCreateNoteArgs, parseWireDate } from '../../shared';
import { parse } from 'date-fns';

export const typeDefs = readFileSync('../shared/schema.graphql').toString();

const parseDate = (dateString: string) => {
  return parse(dateString, 'yyyy-MM-DD HH:mm:ss GMT-6', new Date);
}

export const resolvers = {
  Query: {
    allNotes: async () => {
      return knex.from('notes').select<NoteRecord[]>('noteId').then(rows => {
        console.log(rows);
        return rows;
      })
    },

  },

  Mutation: {
    createNote: async (a: any, { noteId, createdAt }: MutationCreateNoteArgs, c: any) => {
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