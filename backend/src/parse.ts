// parse.ts - document parsing

import { NoteBody, TagNote } from "../../shared"
import { DocumentParseError } from "./errors";

interface RelationTag {
  type: 'tag',
  tagId: string,
  path: number[],
};

type Relation = RelationTag;

/**
 * Discover all relations that should exist as a result of a document
 */
export const discoverRelations = (noteBody: NoteBody, path: number[] = []): Relation[] => {
  let relations: Relation[] = [];

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
      case 'line': case 'heading': {
        relations = relations.concat(discoverRelations(node.children, [...path, i]));
        break;
      }
      case 'at_type_select':
        // ignore, no relations and no children
        break;
      default: {
        throw new DocumentParseError(`Unknown document node type ${(node as any).type}`);
      }
    }
  }

  return relations;
}

/**
 * Discovers document title, if it has one
 * @param noteBody 
 */
export const discoverTitle = (noteBody: NoteBody): string | null => {
  if (noteBody.length === 0) return null;

  const firstNode = noteBody[0];

  if (!('type' in firstNode)) return null;

  if (firstNode.type === 'heading' && firstNode.level === 1) {
    const textNode = firstNode.children[0];
    if ('type' in textNode) return null;

    return textNode.text;
  }

  return null;
}