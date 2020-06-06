import { configureStore, createSlice } from '@reduxjs/toolkit';
import logger from 'redux-logger';

import { TDocument, TDocumentRecord } from './types';
import { generateId } from '../lib/utilities';
import { loadState, saveState } from './storage';


const initialDocument: TDocumentRecord = {
  id: generateId('doc'),
  document: [{
    type: 'line',
    children: [{ text: 'click to edit' }]
  }]
};

const initialCollection = {
  collectionType: 'simple',
  name: 'Run',
};


export type UpdateDocumentAction = {
  type: string;
  payload: {
    id: string;
    document: TDocument;
  }
};

export type CreateDocumentAction = {
  type: string;
  payload: {},
};

const docs = createSlice({
  name: "docs",
  initialState: loadState(),
  reducers: {
    updateDocument(state, action: UpdateDocumentAction) {
      state.documents = state.documents.map(doc => {
        if (doc.id !== action.payload.id) return doc;
        return {
          id: doc.id,
          document: action.payload.document,
        };
      })
    },
    createDocument(state, _action: CreateDocumentAction) {
      state.documents.push({
        id: generateId('doc'),
        document: initialDocument.document
      });
    }
  },
});

const persistMiddleware: any = (store: any) => (next: any) => (action: any) => {
  let result = next(action);
  saveState(store.getState());
  return result;
}

export const { createDocument, updateDocument } = docs.actions;

export const store = configureStore({
  reducer: docs.reducer,
  middleware: [
    persistMiddleware,
    logger,
  ],
})