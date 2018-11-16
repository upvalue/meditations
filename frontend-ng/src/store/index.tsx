import { createStore, applyMiddleware } from 'redux';
import logger from 'redux-logger';

export const store = createStore(
  () => ({}),
  applyMiddleware(logger)
);
