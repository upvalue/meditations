import * as moment from 'moment';
import route from 'riot-route';

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
