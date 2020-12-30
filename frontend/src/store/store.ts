import { combineReducers, configureStore, createSlice, PayloadAction } from '@reduxjs/toolkit';
import logger from 'redux-logger';

import { NoteBody, Tag } from '../../../shared';


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
  initialState: {},
  reducers: {},
});

export type CreateTagAction = {
  type: string;
  tag: Tag;
};

export type TagState = {
  tagsByName: { [tagName: string]: Tag },
  tagsById: { [tagId: string]: Tag },

}

const initialTagState: TagState = {
  tagsByName: {},
  tagsById: {},
};

export const tagSlice = createSlice({
  name: "tags",
  initialState: initialTagState,
  reducers: {
    loadTags: (state, action: PayloadAction<{ tags: Tag[] }>) => {
      action.payload.tags.forEach(tag => {
        state.tagsByName[tag.tagName] = tag;
        state.tagsById[tag.tagId] = tag;
      });
    },
    addTag: (state, action: PayloadAction<Tag>) => {
      const tag = action.payload;
      state.tagsByName[tag.tagName] = tag;
      state.tagsById[tag.tagId] = tag;
    },
  },
});


export type TState = {
  tags: TagState,
};

export const store = configureStore({
  reducer: combineReducers({
    tags: tagSlice.reducer,
  }),
  middleware: [
    logger,
  ],
})