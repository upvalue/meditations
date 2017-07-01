///<reference path="riot-route/index.d.ts" />
///<reference path="medium-editor-tables/index.d.ts" />

import * as moment from 'moment';
import * as redux from 'redux';
import thunk from 'redux-thunk';
import logger from 'redux-logger';
import route from 'riot-route';
import * as React from 'react';
import * as reactredux from 'react-redux';
import * as ReactDOM from 'react-dom';
import * as MediumEditor from 'medium-editor';
import MediumEditorTable from 'medium-editor-tables';

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
  e.CreatedAt = moment((e.CreatedAt as any) as string);
  e.UpdatedAt = moment((e.UpdatedAt as any) as string);
  e.Date = moment.utc((e.Date as any) as string);
  if (e.DeletedAt) {
    e.DeletedAt = moment((e.DeletedAt as any) as string);
  }
};

///// REDUX COMMON STATE
type Notification = {error: boolean, message: string};

export type NotificationOpen = {
  type: 'NOTIFICATION_OPEN'
  notification: Notification;
};

export type CommonAction = NotificationOpen | { type: 'NOTIFICATIONS_DISMISS' };

export type CommonState = {
  dismissNotifications: () => void;
  notifications?: Notification[];
};

function reduceReducers<S>(...reducers: redux.Reducer<S>[]): redux.Reducer<S> {
  return (previous:any, current: any) =>
    reducers.reduce((p: any, r: any) => r(p, current), previous);
}

export function commonReducer(state: CommonState, action: CommonAction): CommonState  {
  switch (action.type) {
    case 'NOTIFICATION_OPEN':
      if (state.notifications) {
        return {...state,
          notifications: [...state.notifications, action.notification],
        };
      } else {
        return { ...state, notifications: [action.notification] };
      }
    case 'NOTIFICATIONS_DISMISS':
      return { ...state, notifications: undefined };
  }
  return state;
}

/**
 * This creates a store with thunk & logger middleware applied and a common reducer added. 
 * @param reducer 
 * @param initialState 
 * @returns a tuple containing the store, a dispatcher that type-checks synchronous actions,
 * and a dispatcher that type-checks redux-thunk actions
 */
export function createStore<State extends CommonState, Action extends redux.Action>(
    reducer: (s: State,  a: Action) => State, initialState: State):
      [redux.Store<State>,
       (action: Action) => void,
       (dispatcher: (thunk: (action: Action) => void) => void) => void
       ] {


  const combinedReducer = (pstate: State = initialState, action: redux.Action): State => {
    let state = commonReducer(pstate as CommonState, action as any as CommonAction) ;
    console.log('combinedReducer', state);
    state = reducer(state as State, action as Action);
    return state as State;
  };

  const store = redux.createStore<State>(combinedReducer, redux.applyMiddleware(thunk, logger));

  const typedDispatch = (action: Action) => {
    return store.dispatch(action);
  };

  const thunkDispatch = (dispatcher: (thunk: (action: Action) => void) => void) => {
    store.dispatch(dispatcher as any);
  };

  return [store, typedDispatch, thunkDispatch];
}

///// REACT COMMON

/** Simple CSS loading spinner */
export const Spinner = (props: any) => {
  return <div className="spinner">
    <div className="bounce1" />
    <div className="bounce2" />
    <div className="bounce3" />
  </div>;
};

/** A bar at the top which displays notifications */
interface NotificationBarProps {
  dismiss: () => void;
  notifications?: Notification[];
}

export const NotificationBar: React.SFC<NotificationBarProps> = (props) => {
  if (props.notifications) {
    return <div>
      <button className="btn btn-outline-warning btn-sm octicon octicon-x"
        onClick={() => props.dismiss()}>Dismiss notifications</button>
      <div className="notifications card-group">
        {props.notifications.map((n, i) => {
          return <div key={i} className={`card ${n.error ? 'card-outline-warning' : ''}`}>
            <div className="card-block">
              {n.message}
            </div>
          </div>;
        })}
      </div>
    </div>;
  } else {
    return <span />;
  }
};

/**
 * Shorthand for fetch which reports errors to user via redux
 * @param method get or post
 * @param body data
 * @param dispatch Callback to dispatch a Redux action
 * @param url URL of the request
 */
export function request<ResponseType>(
    method: string, body: any, dispatch: (a: CommonAction) => void, url: string,
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

    // Only GET requests will return JSON to be processed;
    // POST requests will result in a WebSocket message if anything
    // as they must be pushed to all clients
    if (method === 'GET') {
      return response.json().then(then);
    }
  }).catch((reason) => {
    dispatch({type: 'NOTIFICATION_OPEN',
      notification: { error: true, message: `Fetch failed with message: ${reason}` },
    });

    console.warn(`Fetch ${url} failed ${reason}`);
  });
}

export function get<ResponseType>(
  dispatch: (action: CommonAction) => void, url: string, then: (res: ResponseType) => void,
) {
  return request<ResponseType>('GET', undefined, dispatch, url, then);
}


export function post<ResponseType>(
  dispatch: (action: CommonAction) => void, url: string, body?: any,
) {
  return request<ResponseType>('POST', body, dispatch, url);
}

export function dismissNotifications<State extends CommonState>(dispatch: redux.Dispatch<State>) {
  dispatch({ type: 'NOTIFICATIONS_DISMISS' } as CommonAction);
}

export function connect() {
  return reactredux.connect(
    state => state,
    (dispatch) => {
      return {
        dismissNotifications: () => dispatch({ type: 'NOTIFICATIONS_DISMISS' } as CommonAction),
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
export const DAY_FORMAT = 'YYYY-MM-DD';

/**
 * makeSocket connects to a websocket
 *
 * @param location Address of websocket (e.g. "/journal/sync")
 * @param onmessage Callback when message is received
 * @returns {WebSocket}
 */
export function makeSocket(location: string, onmessage: (s: any) => void,
    onopen?: () => void) {
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  const url = `${protocol}://${window.location.hostname}:${window.location.port}/${location}`;
  const socket = new WebSocket(url);

  socket.onopen = (m) => {
    console.log(`Common.makeSocket: Connected to ${url} WebSocket`);
    if (onopen) {
      onopen();
    }
  };

  socket.onmessage = (m) => {
    onmessage(JSON.parse(m.data));
  };

  return socket;
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
}

/**
 * Create a medium-editor instance on a given element
 *
 * @param elt
 * @param focus?
 * @param blur? Action on blur
 * @param opts Additional options to pass to medium editor
 * @returns {MediumEditor.MediumEditor}
 */
export function makeEditor(elt: any, focus?: () => void, blur?: () => void,
    opts?: MediumEditor.CoreOptions): MediumEditor.MediumEditor {
  const options = {
    autoLink: true,
    placeholder: true, 

    toolbar: {
      buttons: ['bold', 'italic', 'underline',
        'anchor', 'image', 'quote', 'orderedlist', 'unorderedlist',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'table'],
    },

    extensions: {
      table: new MediumEditorTable(),
    },
    ...opts};

  const editor = new MediumEditor(elt, options);

  editor.subscribe('focus', () => {
    if (focus) focus();
  });

  editor.subscribe('blur', () => {
    if (blur) blur();
  });
  
  return editor;
}

/** An item that has an editable body. Used for task comments and journal entries */
export class Editable<Props> extends React.Component<Props, {editor: MediumEditor.MediumEditor}> {
  /** 
   * Reference to the HTML element that the MediumEditor will be installed on; should be set in
   * subclass's render method */
  body: HTMLElement;

  componentWillMount() {
    this.setState({});
  }

  /** Abstract method; should compare body against model to determine if an update is warranted */
  editorUpdated() {
    console.warn('editorUpdated not implemented');
    return false;
  }

  /** Abstract method; dispatch an asynchronous update of the Editable in question */
  editorSave() {
    console.warn('editorSave not implemented');
  }

  /** Lazily create an editor; if it already exists, focus on it */
  editorOpen(e?: React.MouseEvent<HTMLElement>) {
    if (!this.state.editor) {
      const editor = makeEditor(this.body, undefined, () => {
        // Called on editor blur, check if anything needs to be updated and call the appropriate
        // method if so.
        const newBody = this.body.innerHTML;

        // Do not update if nothing has changed
        if (!this.editorUpdated()) {
          return;
        }
        
        this.editorSave();
      });
      this.setState({ editor });
    } 
    this.body.focus();
  }
}
