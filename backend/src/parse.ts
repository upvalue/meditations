// parse.ts - document parsing

import { NoteBody, TagNote } from "../../shared"
import knex from "./knex"

/**
 * Return all relations that already exist in the database
 */
const getExistingRelations = (noteId: string) => {
  return knex.from('tag_notes').select<TagNote[]>('noteId, tagId').where({ 'noteId': noteId }).then(rows => rows);
}
// const discoverRelations = ()

type RelationTag = {
  type: 'tag',
  tagId: string,
  path: number[],
};

/**
 * Discover all relations that should exist as a result of a document
 */
export const discoverRelations = (noteBody: NoteBody, path: number[] = []): RelationTag[] => {
  let relations: RelationTag[] = [];

  for (let i = 0; i !== noteBody.length; i += 1) {
    const node = noteBody[i];

    switch (node.type) {
      case 'text': continue;
      case 'tag': {
        relations.push({ type: 'tag', tagId: node.tagId, path: [...path, i] });
      }
      case 'line': {
        relations = relations.concat(discoverRelations(node.children, [...path, i]));
      }
    }
  }

  return relations;
}