// parse.ts - document parsing

import { NoteBody, TagNote } from "../../shared"
import { DocumentParseError } from "./errors";
import knex from "./knex"

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

  console.log(noteBody);

  for (let i = 0; i !== noteBody.length; i += 1) {
    const node = noteBody[i];

    // Leaf node, continue
    if (!('type' in node)) {
      continue;
    }

    switch (node.type) {
      case 'tag': {
        relations.push({ type: 'tag', tagId: node.tagId, path: [...path, i] });
        break;
      }
      case 'line': {
        relations = relations.concat(discoverRelations(node.children, [...path, i]));
        break;
      }
      default: {
        throw new DocumentParseError(`Unknown document node type ${node.type}`);
      }
    }
  }

  return relations;
}