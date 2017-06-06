///<reference path="riot-route/index.d.ts" />
import * as moment from 'moment';
import * as $ from 'jquery';
import route from 'riot-route';
import * as MediumEditor from 'medium-editor';

export interface Model {
  ID: number;
  CreatedAt: string;
  UpdatedAt: string;
  DeletedAt: string | null;
};

/**
 * The format used to browse by months.
 */
export const MONTH_FORMAT: string = 'YYYY-MM';

/**
 * Returns time formatted as YYYY-MM string
 */
export function monthToString(time?: moment.Moment): string {
  if(!time) {
    time = moment();
  }
  return time.format(MONTH_FORMAT);
}

/**
 * Converts YYYY-MM string to Moment
 *
 * @param time
 * @returns {moment.Moment}
 */
export function monthFromString(time: string): moment.Moment {
  return moment(time, MONTH_FORMAT);
}

export function request(url: string, datum: any) {
  const ret = {...{'type': 'POST', url: url, contentType: 'application/json; charset=UTF-8'}, data: JSON.stringify(datum)};
  return $.ajax(ret);
}

/**
 * makeSocket
 *
 * @param location Address of websocket (e.g. "/journal/sync")
 * @param onmessage Callback when message is received
 * @returns {WebSocket}
 */
export function makeSocket(location: string, onmessage: (s: any) => void) {
  const protocol = window.location.protocol == 'https:' ? 'wss' : 'ws';
  const url = `${protocol}://${window.location.hostname}:${window.location.port}/${location}`;
  const socket = new WebSocket(url);

  socket.onopen = (m) => {
    console.log(`Common.makeSocket: Connected to ${url} WebSocket`);
  }

  socket.onmessage = (m) => {
    onmessage(JSON.parse(m.data));
  }

  return socket;
}

/**
 * Starts riot-route and executes callbacks from a given object.
 *
 * @param base Prepended to all routes on a page (e.g. "/journal#")
 * @param first The initial route to execute if none are given
 * @param routes Mapping of routes as strings to callbacks.
 * Special routes: no_action for when no route is given, and unknown for when an unknown route is given.
 */
export function installRouter(base: string, first: string, routes: { [key: string] : (...a: any[]) => void }) {
  console.log('Common.installRouter called');
  route(function() {
    const action = [].shift.apply(arguments);
    console.log(`Common.installRouter: dispatching ${action}`);

    if(routes[action]) {
      routes[action].apply(this, arguments);      
    } else if(action == '' && routes['no_action']) {
      routes['no_action'].apply(this, arguments);
    } else{
      if(routes['unknown']) {
        routes['unknown'].apply(this, arguments);
      } else {
        console.warn(`Common.installRouter: unknown action ${action}`);
      }
    }
  });

  route.base(base);
  route.start(true);

  if(window.location.hash.length <= 2) {
    if(first) {
      route(first);
    }
  } 
}

/**
 * Create an editor
 *
 * @param elt
 * @param focus?
 * @param blur? Action on blur
 * @param opts Additional options to pass to medium editor
 * @returns {MediumEditor.MediumEditor}
 */
export function makeEditor(elt: any, focus?: () => void, blur?: () => void, opts?: MediumEditor.CoreOptions): MediumEditor.MediumEditor {
  const options = {
    autoLink: true,
    placeholder: true, 
    extensions: {}, 

    toolbar: { buttons: ['bold', 'italic', 'underline', 'anchor', 'image', 'quote', 'orderedlist', 'unorderedlist',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'table' ] },
    ...opts};

  const editor = new MediumEditor(elt, options);

  editor.subscribe('focus', () => {
    if(focus) focus();
  });

  editor.subscribe('blur', () => {
    if(blur) blur();
  });
  
  return editor;
}
