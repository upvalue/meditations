import * as moment from 'moment';

import * as common from '../common';

import { SidebarState, JournalSidebar } from './sidebar';

///// BACKEND INTERACTION

export interface Tag {
  Name: string;
}

export interface Entry extends common.Model {
  Date: moment.Moment;
  Name: string;
  Body: string;
  LastBody: string;
  Tags: ReadonlyArray<Tag> | undefined;
}

///// REDUX

export interface JournalCommonState extends common.CommonState {
  entries: Entry[];
  sidebar: SidebarState;
}

export interface ViewSearch extends JournalCommonState {
  route: 'VIEW_SEARCH';
  searchString: string;
}

export interface ViewMonth extends JournalCommonState {
  route: 'VIEW_MONTH';
  date: moment.Moment;
}

export interface ViewTag extends JournalCommonState {
  route: 'VIEW_TAG';
  tag: string;
}

export interface ViewDays extends JournalCommonState {
  route: 'VIEW_DAYS';
  date: moment.Moment;
}

export interface ViewNamedEntry extends JournalCommonState {
  route: 'VIEW_NAMED_ENTRY';
}

export type JournalState = ViewTag | ViewNamedEntry | ViewMonth | ViewSearch | ViewDays;

export type JournalAction = {
  type: 'VIEW_MONTH';
  date: moment.Moment;
  entries: Entry[];  
} | {
  type: 'VIEW_DAYS';
  date: moment.Moment;
  entries: Entry[];
} | {
  type: 'MOUNT_ENTRIES';
  entries: Entry[];
} | {
  type: 'CREATE_ENTRY';
  entry: Entry;  
} | {
  type: 'UPDATE_ENTRY';
  entry: Entry;  
} | {
  type: 'DELETE_ENTRY';
  ID: number;
} | {
  type: 'VIEW_TAG';
  tag: string;
  entries: Entry[];
} | {
  type: 'MOUNT_SIDEBAR';
  sidebar: SidebarState;
} | { 
  type: 'SEARCH';
  searchString: string;
} | {
  type: 'VIEW_NAMED_ENTRY';
  entry: Entry;
} | common.CommonAction;

const initialState = {
  notifications: undefined,
  date: moment(new Date()),
  sidebar: { mounted: false },
} as JournalState;

const reducer = (state: JournalState, action: JournalAction): JournalState => {
  console.log(state);
  switch (action.type) {
    case 'VIEW_MONTH':
      return {...state,
        route: 'VIEW_MONTH',
        date: action.date,
        entries: action.entries,
      } as ViewMonth;
    case 'VIEW_DAYS':
      return {...state,
        route: 'VIEW_DAYS',
        date: action.date,
        entries: action.entries,
      } as ViewDays;
    case 'VIEW_TAG':
      return { ...state, route: 'VIEW_TAG', tag: action.tag, entries: action.entries } as ViewTag;
    case 'MOUNT_ENTRIES':
      return {...state,
        entries: action.entries,
      };
    case 'CREATE_ENTRY':
      const entries = state.entries.slice();
      for (let i = 0; i !== entries.length; i += 1) {
        if (entries[i].Date > action.entry.Date) {
          entries.splice(i, 0, action.entry);
          return { ...state, entries };
        }
      }
      entries.unshift(action.entry);
      return { ...state, entries };
    case 'UPDATE_ENTRY':
      // TODO: Iterating over all entries to do these things is a little inefficient,
      // but it probably doesn't matter as
      // long as the UI is snappy. Alternative would be building a map of IDs at render-time

      return {...state,
        entries: state.entries.slice().map(v => v.ID === action.entry.ID ? action.entry : v),
      };
    case 'DELETE_ENTRY':
      return {...state,
        entries: state.entries.slice().filter(v => v.ID !== action.ID),
      };
    case 'SEARCH': {
      return { ...state };
    }
    case 'MOUNT_SIDEBAR': 
      const nstate =  { ...state, sidebar: action.sidebar };
      nstate.sidebar.mounted = true;
      return nstate;
    case 'VIEW_NAMED_ENTRY':
      return { ...state, route: 'VIEW_NAMED_ENTRY', entries: [action.entry] } as ViewNamedEntry;
  }
  return state;
};


export const [store, dispatch] = common.createStore(reducer, initialState);
