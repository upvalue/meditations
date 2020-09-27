import { TDocumentRecord, TCollection } from '../../../shared';

export type TState = {
  documents: TDocumentRecord[];
  collections: { [key: string]: TCollection };
}
