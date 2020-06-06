// storage.ts - load and save from local storage

import { generateId } from "../lib/utilities";
import { TState, TDocumentRecord, TCollection } from "./types";

// Initial state
const initialDocument: TDocumentRecord = {
  id: generateId('doc'),
  document: [{
    type: 'line',
    children: [{ text: 'click to edit' }]
  }]
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