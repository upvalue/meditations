import { combineReducers, configureStore, createSlice, PayloadAction } from '@reduxjs/toolkit';
import logger from 'redux-logger';
import { CombinedError } from 'urql';

import { NoteBody, Tag, ErrorCode } from '../../../shared';


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

export type ErrorDetails = {
  code?: ErrorCode;
  message: string;
};


export type ErrorState = {
  errors: ErrorDetails[],
};

const initialErrorState: ErrorState = {
  errors: []
};

export const errorSlice = createSlice({
  name: "errors",
  initialState: initialErrorState,
  reducers: {
    /**
     * Report errors, attempting to intelligently parse some information about them where possible
     * @param state 
     * @param action 
     */
    reportError: (state, action: PayloadAction<string | CombinedError>) => {
      if (typeof action.payload === 'string') {
        state.errors.push({ message: action.payload });
      } else {
        const combinedErr = action.payload;

        // Try to find a detailed error message
        for (const err of combinedErr.graphQLErrors) {
          console.log(err);
          if (err.extensions && err.extensions.code) {
            state.errors.push({
              code: err.extensions.code,
              message: err.message,
            });
          } else {
            state.errors.push({
              message: err.message
            });
          }
        }
      }
    },
  }
})

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


export type StoreState = {
  errors: ErrorState,
  tags: TagState,
};

export const store = configureStore({
  reducer: combineReducers({
    errors: errorSlice.reducer,
    tags: tagSlice.reducer,
  }),
  middleware: [
    logger,
  ],
})