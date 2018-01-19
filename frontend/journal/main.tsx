import * as React from 'react';
import route from 'riot-route';
import * as Scroll from 'react-scroll';


import * as moment from 'moment';
import * as common from '../common';

import { JournalRoot } from './components';
import { SidebarState } from './sidebar';
import { store, dispatch, Entry } from './state';

export const main = () => {
  ///// ROUTES
  // Install router. If no route was specifically given, start with #view/YYYY-MM
  common.installRouter('/journal#', `view/${moment().format(common.MONTH_FORMAT)}`, {
    no_action: () => route(`view/${moment().format(common.MONTH_FORMAT)}`),
    journal: () => null, // Dummy, called if journal is clicked from navbar

    view: (datestr: string, entryScrollId?: string) => {
      const date = moment(datestr, common.MONTH_FORMAT);

      if (entryScrollId && !isNaN(parseInt(entryScrollId, 10))) {
        Scroll.scroller.scrollTo(`entry-${entryScrollId}`, {
          smooth: true,
          duration: 500,
        });
      }

      common.setTitle('Notes', `${date.format('MMMM YYYY')}`);

      // TODO: Update habits link to reflect current date
      dispatch((dispatch) => {
        common.get(`/journal/entries/date?date=${datestr}`, ((entries: Entry[]) => {
          entries.forEach(common.processModel);
          dispatch({ date, entries, type: 'VIEW_MONTH' });
        }));
      });

      dispatch((dispatch) => {
        common.get(`/journal/entries/date?date=${datestr}`, ((entries: Entry[]) => {
          entries.forEach(common.processModel);
          dispatch({ date, entries, type: 'VIEW_MONTH' });
        }));
      });
    },

    viewdays: (datestr: string) => {
      const date = moment(datestr, common.DAY_FORMAT);

      dispatch((dispatch) => {
        common.get(`/journal/entries/by-day?date=${datestr}`, ((entries: Entry[]) => {
          entries.forEach(common.processModel);
          dispatch({ date, entries, type: 'VIEW_DAYS' });
        }));
      });
    },

    search: (string: string) => {

    },

    tag: (tagname: string) => {
      common.setTitle('Notes', `Tag #${tagname}`);
      dispatch((dispatch) => {
        common.get(`/journal/entries/tag/${tagname}`, ((entries: Entry[]) => {
          entries.forEach(common.processModel);
          dispatch({ entries, type: 'VIEW_TAG', tag: tagname });
        }));
      });
    },
    
    name: (name: string) => {
      common.setTitle('Notes', `${name}`);
      dispatch((dispatch) => {
        common.get(`/journal/entries/name/${name}`, (entry: Entry) => {
          common.processModel(entry);
          dispatch({ entry, type: 'VIEW_NAMED_ENTRY' });
        });
      });
    },
  });

  // WebSocket handling
  type JournalMessage = {
    Type: 'UPDATE_ENTRY';
    Datum: Entry;
  } | {
    Type: 'DELETE_ENTRY';
    Datum: number;
  } | {
    Type: 'CREATE_ENTRY';
    Datum: Entry;
  } | {
    Type: 'SIDEBAR';
    Datum: SidebarState;
  } | {
    Type: 'SEARCH';
    Datum: string;
  };

  const socket = common.makeSocket('journal/sync', (msg: JournalMessage) => {
    switch (msg.Type) {
      case 'UPDATE_ENTRY':
        common.processModel(msg.Datum);
        dispatch({ type: 'UPDATE_ENTRY', entry: msg.Datum });
        break;
      case 'DELETE_ENTRY':
        dispatch({ type: 'DELETE_ENTRY', ID: msg.Datum });
        break;
      case 'CREATE_ENTRY':
        common.processModel(msg.Datum);
        // TODO: View change?
        // TODO: Dispatch view change
        dispatch({ type: 'CREATE_ENTRY', entry: msg.Datum });
        break;
      case 'SIDEBAR':
        dispatch({ type: 'MOUNT_SIDEBAR', sidebar: msg.Datum });
        break;
      case 'SEARCH':
        dispatch({ type: 'SEARCH', searchString: msg.Datum });
        break;

    }
  }, () => {
    ///// RENDER 
    // After socket connects
    common.render('journal-root', store, <JournalRoot />);

    // Fetch sidebar
    common.post('/journal/sidebar');
  });
};
