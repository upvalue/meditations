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

declare global {
  /** Extend window with a meditations object for console interaction. */
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

/** Action that causes a modal prompt to be opened */
export type ModalPrompt = {
  type: 'MODAL_PROMPT';
  modalBody: React.ReactNode;
};

export type CommonAction = NotificationOpen | { type: 'NOTIFICATIONS_DISMISS' } | ModalPrompt |
  { type: 'SOCKET_OPENED', socket: WebSocket, socketReconnect: () => void } |
  { type: 'SOCKET_CLOSED' } | { type: 'MODAL_DISMISS' };

export type ModalPromptDispatcher =
  (text:string, ok: string, onClose: (result: string) => void) => void;

export type CommonActionDispatcher = (a: CommonAction) => void;

export type CommonState = {
  socketClosed: boolean;
  notifications?: Notification[];
  socket: WebSocket;

  modalBody: React.ReactNode;
  modalOpen: boolean;

  dismissModal: () => void;
  dismissNotifications: () => void;
  /** Method for attempting a socket reconnect */
  socketReconnect: () => void;
};

function reduceReducers<S>(...reducers: redux.Reducer<S>[]): redux.Reducer<S> {
  return (previous:any, current: any) =>
    reducers.reduce((p: any, r: any) => r(p, current), previous);
}

export function commonReducer(state: CommonState, action: CommonAction): CommonState  {
  switch (action.type) {
    case 'NOTIFICATION_OPEN':
      // Append to list of notifications, or create it if it doesn't exist.
      if (state.notifications) {
        return {...state,
          notifications: [...state.notifications, action.notification],
        };
      } else {
        return { ...state, notifications: [action.notification] };
      }
    case 'SOCKET_CLOSED':
      return { ...state, socketClosed: true };
    case 'SOCKET_OPENED':
      return { ...state, socketClosed: false, socket: action.socket,
        socketReconnect: action.socketReconnect };
    case 'NOTIFICATIONS_DISMISS':
      return { ...state, notifications: undefined };
    case 'MODAL_DISMISS':
      return { ...state, modalOpen: false };
    case 'MODAL_PROMPT':
      return { ...state, modalOpen: true, 
        modalBody: action.modalBody };
  }
  return state;
}

export let dispatch: (action: CommonAction) => void;

/**
 * This creates a store with thunk & logger middleware applied and a common reducer added. 
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

  const store = redux.createStore<State>(combinedReducer, redux.applyMiddleware(thunk, logger));

  type AsyncAction = ((thunk: (action: Action) => void) => void);
  const typedDispatch = (action: Action | AsyncAction) => {
    return store.dispatch(action as any);
  };

  dispatch = typedDispatch as (action: CommonAction) => void;

  return [store, typedDispatch];
}

///// ACTION CREATE-AND-DISPATCHERS

/**
 * Open a modal prompt with a text input
 * @param dispatch Typed dispatcher
 * @param body Text of the prompt
 * @param ok Text of the prompt submission button
 * @param cb Success callback
 * @param defaultValue Default value of the input field
 * @param checker Can return an error representing an input issue which will be displayed in the
 *   modal
 */
export const modalPrompt = (body: string, ok: string, cb: (result: string) => void,
    defaultValue?: string, checker?: (chk: string) => string) => {

  let ref: HTMLInputElement;
  let err: HTMLElement;
  let errmsg = '';

  const dismiss = () => dispatch({ type: 'MODAL_DISMISS' });

  const submit = (e?: React.FormEvent<HTMLFormElement>) => {
    if (e) {
      e.preventDefault();
    }

    // Optionally, arguments can be checked for validity before submission.
    if (checker) {
      errmsg = checker(ref.value);
      if (errmsg !== '') {
        err.className = 'flash flash-error mt-1 mb-1';
        err.innerText = errmsg;
        return;
      }
    }

    if (ref.value !== '') {
      cb(ref.value);
    }
    dismiss();
  };

  dispatch({
    type: 'MODAL_PROMPT',
    modalBody: <form onSubmit={e => submit(e)}>
      <span>{body}</span>
      <div ref={(elt) => { if (elt) { err = elt; } }} />
      <input defaultValue={defaultValue || ''} ref={(e) => { if (e) { ref = e; e.focus(); } }}
        className="form-control input-block mb-1" type="text" />
      <button className="btn btn-primary btn-block mb-1" onClick={() => submit()}>{ok}</button>
      <button className="btn btn-secondary btn-block" onClick={dismiss}
      >Close</button>
    </form>,
  });
};

/**
 * Open a yes/no confirmation prompt
 * @param dispatch typedDispatch
 * @param bodyText Text of the body
 * @param confirmText Text of the yes button
 * @param cb Callback when yes button is clicked
 */
export const modalConfirm = (bodyText: string, confirmText: string, cb: () => void) => {

  const dismiss = () => dispatch({ type: 'MODAL_DISMISS' });

  dispatch({
    type: 'MODAL_PROMPT',
    modalBody: <div>
      <span>{bodyText}</span>
      <button className="btn btn-danger btn-block mb-1" onClick={() => {dismiss(); cb(); }}
        ref={(e) => { if (e) { e.focus(); } }} >
        {confirmText}
      </button>
      <button className="btn btn-secondary btn-block mb-1" onClick={dismiss}>
        Cancel
      </button>
    </div>,
  });
};

export const modalPromptChecked = (body: string, ok: string, defaultValue: string,
    checker: (chk: string) => string,
    callback: (result: string) => void) => {
  modalPrompt(body, ok, callback, defaultValue, checker);
};

///// REACT COMMON

/** Simple CSS loading spinner */
export const Spinner = (props: any) => {
  return <div className="spinner">
    <div className="bounce1" />
    <div className="bounce2" />
    <div className="bounce3" />
  </div>;
};

/**
 * Common UI elements (currently just a notification bar that appears at the top)
 */
export class CommonUI extends React.Component<CommonState, {}> {
  reconnect() {
    this.props.socketReconnect();
  }
  
  renderPopups() {
    if (!this.props.notifications && !this.props.socketClosed) {
      return <span />;
    }

    return <div id="notifications" className="bg-gray border border-gray-dark p-2">
      <h3>Notifications
        {this.props.notifications &&
          <span className="float-right Label Label--gray-darker">
            {this.props.notifications.length}
          </span>
        }
      </h3>

      {this.props.socketClosed && <div>
        <div className="notification flash flash-error mb-2">
          <p>WebSocket connection failed!</p>
          <button className="btn btn-primary" onClick={() => this.reconnect()}>
            Attempt reconnection
          </button>
        </div>
      </div>}

      {this.props.notifications &&
        <button className="btn btn-block mb-2" onClick={this.props.dismissNotifications}>
          Dismiss all notifications
        </button>}

      {this.props.notifications && this.props.notifications.map((n, i) => {
        return <div key={i} className={`notification flash flash-with-icon mb-2
          ${n.error ? 'flash-danger' : ''}`}>
          {n.message}

        </div>;
      })}
    </div>;
  }

  renderModal() {
    return <div id="modal" className="bg-white border border-gray-dark p-2">
      <div className="float-right">
        <button className="btn btn-sm mb-2" onClick={() => this.props.dismissModal()}>
          <span className="octicon octicon-x"
            aria-label="Dismiss prompt" />
        </button>
      </div>
      {this.props.modalBody}
    </div>;
  }

  render() {
    // When socket is not active, blur UI to indicate it is unusable.
    // TODO: Figure out how to capture user interaction as well
  
    let filterAll: any;
    let clickCatch: any;
    if (this.props.modalOpen) {
      filterAll = { style: { filter: 'opacity(80%)' } };
      clickCatch = {
        onClick: (e: MouseEvent) => {
          e.preventDefault();
          this.props.dismissModal();
        },
      };
    }

    if (this.props.socketClosed) {
      filterAll = { style: { filter: 'blur(1px)' } };
      clickCatch = {
        onClick: (e: MouseEvent) => e.preventDefault(),
      };
    }

    return <div>
      {this.props.modalOpen && this.renderModal()}
      {this.renderPopups()}
      <div {...clickCatch} {...filterAll}>{this.props.children}</div>
    </div>;
  }
}

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

    // Only GET requests will return JSON to be processed;
    // POST requests will result in a WebSocket message if anything
    // as they must be pushed to all clients
    if (method === 'GET') {
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


export function post<ResponseType>(url: string, body?: any,) {
  return request<ResponseType>('POST', body, url);
}

export function connect() {
  return reactredux.connect(
    state => state,
    (dispatch: (a: CommonAction) => void) => {
      const dismiss = () => dispatch({ type: 'MODAL_DISMISS' });
      return {
        dismissModal: dismiss,

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
      dispatch({ type: 'NOTIFICATION_OPEN', notification: { error: false,
        message: 'Reconnection successful'}});
    }

    dispatch({ socket, type: 'SOCKET_OPENED', socketReconnect: () => {
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
    dispatch({ type: 'SOCKET_CLOSED' });
  };

  return socket;
}

/**
 * Set the document title.
 * @param page Page (habits, journal, etc)
 * @param title Actual title
 */
export function setTitle(page: string, title: string) {
  document.title = `${title} | ${page} | meditations`;
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

    keyboardCommands: false,

    paste: { cleanPastedHTML: true, forcePlainText: false },
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
export class Editable<Props> extends React.PureComponent<Props,
  {editor: MediumEditor.MediumEditor}> {
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
        // It is possible that blur may have been called because copy-paste causes MediumEditor to
        // create a 'pastebin' element, in which case we do not want to trigger a save.
        if (document.activeElement.id.startsWith('medium-editor-pastebin')) {
          return;
        }

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
    // Empty comments will have the no-display class added
    this.body.classList.remove('no-display');
    this.body.focus();
  }
}

/** A muted Octicon button */
export const OcticonButton: React.SFC<{ name: string, onClick: () => void, 
  tooltip: string, tooltipDirection?: string, className?: string }> =

  ({ name, onClick, tooltip, tooltipDirection, className }) => {
    return <button className={`btn btn-octicon tooltipped tooltipped-${tooltipDirection}
        ${className}`}
        aria-label={tooltip}
        onClick={onClick}>
        <span className={`octicon octicon-${name}`} />
      </button>;
  };


OcticonButton.defaultProps = {
  tooltipDirection: 'w',
  className: '',
};
