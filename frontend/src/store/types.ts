// types.ts - Document types

/**
 * For simplicty's sake, we keep these separate from SlateJS types, since SlateJS has some
 * fairly generous type definitions (e.g. allowing [key: string]: unknown) and we can narrow
 * our types down and use them in and around the program.
 * 
 * Also prefix them with T since there's a lot of overlap with both Slate types and browser builtins.
 */

export type TText = {
  text: string;
};

export type TElement = {
  type: 'line' | 'heading';
  children: TNode[];
};

export type TNode = TText | TElement;

export type TDocument = TNode[];

/**
 * A document record; would be a toplevel database record containing an actual
 * document as well as information about it
 */
export type TDocumentRecord = {
  id: string;
  document: TDocument;
};

export type TCollection = {
  collectionType: 'simple';
  name: string;
};

export type TCollectionEntry = {
  id: string;
  entryStatus: 'unset' | 'complete' | 'incomplete';
  entryValue: any;
};

export type TState = {
  documents: TDocumentRecord[];
  collections: { [key: string]: TCollection };
}
