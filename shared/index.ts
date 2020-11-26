// types.ts - Document types

/**
 * For simplicty's sake, we keep these separate from SlateJS types, since SlateJS has some
 * fairly generous type definitions (e.g. allowing [key: string]: unknown) and we can narrow
 * our types down and use them in and around the program.
 * 
 * Also prefix them with T since there's a lot of overlap with both Slate types and browser builtins.
 */

export type TText = {
  type: 'text',
  text: string;
};

export type TLine = {
  type: 'line';
  children: TNode[];
};

export type THeader = {
  type: 'heading';
  level: number;
  children: TNode[];
}

export type TElement = TLine | THeader;

export type TNode = TText | TElement;

export type NoteBody = TNode[];

export type TCollection = {
  collectionType: 'simple';
  name: string;
};

export type TCollectionEntry = {
  id: string;
  entryStatus: 'unset' | 'complete' | 'incomplete';
  entryValue: any;
};

// Export date functionality
export * from './dates';

// Re-export GraphQL generated types
export * from './types-generated';
