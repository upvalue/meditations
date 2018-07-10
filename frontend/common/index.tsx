///<reference path="../bindings.d.ts" />

import * as moment from 'moment';
import * as redux from 'redux';
import thunk from 'redux-thunk';
import logger from 'redux-logger';
import route from 'riot-route';
import * as React from 'react';
import * as reactredux from 'react-redux';
import * as ReactDOM from 'react-dom';
import { fetchStoredUIState, storeUIState } from './storage';

declare global {
  /** Extend window with a meditations object for simple console interaction. */
  interface Window {
    meditations: any;
  }
}

/** Fields common to all models */
export interface Model {
  ID: number;
  CreatedAt: moment.Moment;
  UpdatedAt: moment.Moment;
  DeletedAt: moment.Moment | null;
  Date: moment.Moment;
}

/** Converts JSON strings to moment dates when received from backend */
export const processModel = (e: Model) => {
  // Convert from JSON
  // Hey, this is a lot of fun, just like casting a bunch of stuff in C++!
  e.CreatedAt = moment.utc((e.CreatedAt as any) as string);
  e.UpdatedAt = moment.utc((e.UpdatedAt as any) as string);
  e.Date = moment.utc((e.Date as any) as string);
  if (e.DeletedAt) {
    e.DeletedAt = moment.utc((e.DeletedAt as any) as string);
  }
};

///// REDUX COMMON STATE
type Notification = {error: boolean, message: string};

/** Action that causes a new notification to be opened */
export type NotificationOpen = {
  type: 'NOTIFICATION_OPEN'
  notification: Notification;
};

export type CommonAction = NotificationOpen | { type: 'NOTIFICATIONS_DISMISS' } |
  { type: 'SOCKET_OPENED', socketReconnect: () => void } |
  { type: 'SOCKET_CLOSED' };

export type CommonActionDispatcher = (a: CommonAction) => void;

export type CommonState = {
  socketClosed: boolean;
  notifications?: Notification[];

  dismissNotifications: () => void;
  /** Method for attempting a socket reconnect */
  socketReconnect: () => void;
};

export let dispatch: (action: CommonAction) => void;

export function commonReducer(state: CommonState, action: CommonAction): CommonState  {
  switch (action.type) {
    case 'NOTIFICATION_OPEN':
      // Append to list of notifications, or create it if it doesn't exist.
      if (state.notifications) {
        return {...state,
          notifications: [...state.notifications, action.notification],
        };
      }
      return { ...state, notifications: [action.notification] };
    case 'SOCKET_CLOSED':
      return { ...state, socketClosed: true };
    case 'SOCKET_OPENED':
      return { ...state, socketClosed: false,
        socketReconnect: action.socketReconnect };
    case 'NOTIFICATIONS_DISMISS':
      return { ...state, notifications: undefined };
  }
  return state;
}

/**
 * This creates a store with thunk & logger middleware applied and a common reducer added.
 * The store is also saved off so that common UI items can dispatch actions to it without it needing
 * to be passed as a parameter.
 * @param reducer
 * @param initialState
 * @returns a tuple containing the store and a dispatcher that type-checks synchronous and
 * asynchronous actions
 */
export function createStore<State extends CommonState, Action extends redux.Action>(
    reducer: (s: State,  a: Action) => State, initialState: State):
      [redux.Store<State>,
       (action: Action | ((thunk: (action: Action) => void) => void)) => void
       ] {

  // Apply common reducer to all actions
  const combinedReducer = (pstate: State = initialState, action: redux.Action): State => {
    let state = commonReducer(pstate as CommonState, action as any as CommonAction) ;
    state = reducer(state as State, action as Action);
    return state as State;
  };

  const store = redux.createStore(combinedReducer, redux.applyMiddleware(thunk, logger));

  type AsyncAction = ((thunk: (action: Action) => void) => void);
  const typedDispatch = (action: Action | AsyncAction) => {
    return store.dispatch(action as any);
  };

  dispatch = typedDispatch as (action: CommonAction) => void;

  return [store, typedDispatch];
}

///// ACTION CREATE-AND-DISPATCHERS

/**
 * Shorthand for fetch which reports errors to user via redux
 * @param method get or post
 * @param body data
 * @param dispatch Callback to dispatch a Redux action
 * @param url URL of the request
 */
export function request<ResponseType>(
    method: string, body: any, url: string,
    then?: (res:ResponseType) => void) {
  const reqinit: any = { method };
  if (body !== undefined) {
    reqinit.headers = { Accept: 'application/json', 'Content-Type': 'application/json' };
    reqinit.body = JSON.stringify(body);
  }

  return window.fetch(url, reqinit).then((response) => {
    // The response has failed, put up a notification
    if (response.status !== 200) {
      console.warn(`Common.request: ${method} fetch failed with error `);
      response.text().then((response: any) => {
        dispatch({type: 'NOTIFICATION_OPEN',
          notification: { error: true, message: `Fetch failed with message: ${response}` },
        });
      });
      return;
    }

    if (then) {
      return response.json().then(then);
    }
  }).catch((reason) => {
    // TODO this reports all errors as "fetch" errors
    dispatch({type: 'NOTIFICATION_OPEN',
      notification: { error: true, message: `Fetch failed with message: ${reason}` },
    });

    console.warn(`Fetch ${url} failed ${reason}`);
  });
}

export function get<ResponseType>(url: string, then: (res: ResponseType) => void) {
  return request<ResponseType>('GET', undefined, url, then);
}

export function post<ResponseType>(url: string, body?: any, then?: (res: ResponseType) => void) {
  return request<ResponseType>('POST', body, url, then);
}

export function put<ResponseType>(url: string, body?: any, then?: (res: ResponseType) => void) {
  return request<ResponseType>('PUT', body, url, then);
}

export function delete_<ResponseType>(url: string, body?: any, then?: (res: ResponseType) => void) {
  return request<ResponseType>('DELETE', body, url, then);
}

export function connect() {
  return reactredux.connect(
    state => state,
    (dispatch: (a: CommonAction) => void) => {
      return {
        dismissNotifications: () => dispatch({ type: 'NOTIFICATIONS_DISMISS' }),
      };
    },
  );
}

/**
 * Shorthand to render an element under a react-redux Provider
 * @param id HTML element ID to render at
 * @param store Redux Store
 * @param elt Element code
 */
export function render<State>(id: string, store: redux.Store<State>, elt: JSX.Element) {
  ReactDOM.render(<reactredux.Provider store={store}>{elt}</reactredux.Provider>,
    document.getElementById(id)) ;
}

/**
 * The format used in the URL when browsing journal & habits by months
 */
export const MONTH_FORMAT = 'YYYY-MM';
/** Internal format of dates */
export const DAY_FORMAT = 'YYYY-MM-DD';
/** Nice printing of dates */
export const HUMAN_DAY_FORMAT = 'MMMM Do, YYYY';

/**
 * makeSocket connects to a websocket
 *
 * @param location Address of websocket (e.g. "/journal/sync")
 * @param onmessage Callback when message is received
 * @returns {WebSocket}
 */
export function makeSocket(
    location: string, onmessage: (s: any) => void,
    onopen?: () => void,
    reconnect?: boolean) {

  let disconnecting = false;

  // Disconnect the websocket before page unloads
  // To prevent the connection lost modal from popping up on page changes
  window.onbeforeunload = () => {
    disconnecting = true;
  };

  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  const url = `${protocol}://${window.location.hostname}:${window.location.port}/${location}`;
  const socket = new WebSocket(url);

  // console harness
  window.meditations = {
    socket,
    notify: (msg: string) => {
      dispatch({ type: 'NOTIFICATION_OPEN', notification: { error: false, message: msg } });
    },
  };

  socket.onopen = (m) => {
    console.log(`Common.makeSocket: Connected to ${url} WebSocket`);

    // Notify user of successfuly reconnetions
    if (reconnect) {
      dispatch({ type: 'NOTIFICATION_OPEN',
        notification: { error: false, message: 'Reconnection successful' },
      });
    }

    dispatch({ type: 'SOCKET_OPENED', socketReconnect: () => {
      console.log('Attempting to reopen socket');
      makeSocket(location, onmessage, onopen, true);
    }});
    if (onopen) {
      onopen();
    }
  };

  socket.onerror = (e) => {
    if (e.type === 'error') {
      dispatch({
        type: 'NOTIFICATION_OPEN', notification: {
          error: true, message: 'Failed to reconnect',
        },
      });
    }
  };

  socket.onmessage = (m) => {
    onmessage(JSON.parse(m.data));
  };

  socket.onclose = (e) => {
    if (!disconnecting) {
      dispatch({ type: 'SOCKET_CLOSED' });
    }
  };

  return socket;
}

/**
 * Set the document title.
 * @param page Page (habits, journal, etc)
 * @param title Actual title
 */
export function setTitle(page: string, title: string) {
  // In some cases, 'title' may be derived directly from the URI and so we want to make sure
  // it doesn't have URI elements like %20 in it.
  document.title = `${decodeURI(title)} | ${page} | meditations`;
}

/**
 * Starts riot-route and executes callbacks from a given object.
 *
 * @param base Prepended to all routes on a page (e.g. "/journal#")
 * @param first The initial route to execute if none are given
 * @param routes Mapping of routes as strings to callbacks.
 * Special routes: no_action for when no route is given
 * unknown for when an unknown route is given.
 */
export function installRouter(base: string, first: string,
    routes: { [key: string] : (...a: any[]) => void }) {

  console.log('Common.installRouter called');
  route.base(base);
  route(function (this: any) {
    const action = [].shift.apply(arguments);
    console.log(`Common.installRouter: dispatching ${action ? action : 'base'}`);

    if (routes[action]) {
      routes[action].apply(this, arguments);
    } else if (action === '' && routes['no_action']) {
      routes['no_action'].apply(this, arguments);
    } else {
      if (routes['unknown']) {
        routes['unknown'].apply(this, arguments);
      } else {
        console.warn(`Common.installRouter: unknown action ${action}`);
      }
    }
  });

  console.log(`Common.installRouter: starting with base ${base}`);
  route.start(true);

  if (window.location.hash.length <= 2) {
    if (first) {
      route(first);
    }
  }

  // Dispatch introductory messag

  const introMessageSeen = fetchStoredUIState().introMessageSeen;

  if (!introMessageSeen) {
    dispatch({
      type: 'NOTIFICATION_OPEN',
      notification: {
        error: false,
        message: `INTRO`,
      },
    });

    storeUIState({ introMessageSeen: true });
  }
}
