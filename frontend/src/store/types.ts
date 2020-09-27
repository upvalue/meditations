import { NoteRecord, TCollection } from '../../../shared';

export type TState = {
  documents: NoteRecord[];
  collections: { [key: string]: TCollection };
}
