import { readFileSync } from 'fs';
import knex from './knex';

import { NoteRecord } from '../../shared';

export const typeDefs = readFileSync('../shared/schema.graphql').toString();

export const resolvers = {
  Query: {
    allNotes: async () => {
      return knex.from('notes').select<NoteRecord[]>('noteId').then(rows => {
        console.log(rows);
        return rows;
      })
    },
  }
}