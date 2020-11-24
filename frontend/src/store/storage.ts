// storage.ts - load and save from local storage

import { generateId } from "../lib/utilities";
import { TState } from "./types";
import { NoteRecord, TCollection } from '../../../shared';

// Initial state
const initialDocument: NoteRecord = {
  noteId: generateId('note'),
};

const initialCollection: TCollection = {
  collectionType: 'simple',
  name: 'Run',
};

export const initialState: TState = {
  documents: [initialDocument],
  collections: {
    [initialCollection.name]: initialCollection,
  }
}

export const saveState = (state: TState) => {
  window.localStorage.setItem('refractory/state', JSON.stringify(state));
}

export const loadState = () => {
  const serializedState = window.localStorage.getItem('refractory/state');
  if (!serializedState) {
    saveState(initialState);
    return initialState;
  }
  const typedState: TState = JSON.parse(serializedState);
  return typedState;
}