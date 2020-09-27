import knex from './knex';

import { NoteRecord } from '../../shared';

export const typeDefs = `

type NoteRecord {
  note_id: String
}

type Note {
  noteId: String
  body: String
}

type Query {
  allNotes: [NoteRecord!]!
}
`;

export const resolvers = {
  Query: {
    allNotes: async () => {
      return knex.from('notes').select<NoteRecord[]>('note_id').then(rows => {
        console.log(rows);
        return rows;
      })
    },
  }
}