import { configureStore, createSlice } from '@reduxjs/toolkit';
import logger from 'redux-logger';

import { NoteBody, Tag } from '../../../shared';
import { TState } from './types';


export const initialState: TState = {
  tags: {}
}

export type UpdateDocumentAction = {
  type: string;
  payload: {
    id: string;
    document: NoteBody;
  }
};

export type CreateDocumentAction = {
  type: string;
  payload: {},
};

const docs = createSlice({
  name: "docs",
  initialState: initialState,
  reducers: {},
});

export type CreateTagAction = {
  type: string;
  tag: Tag;
};

export const store = configureStore({
  reducer: docs.reducer,
  middleware: [
    logger,
  ],
})