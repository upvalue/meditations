///<reference path="riot-route/index.d.ts" />

import * as fetch from 'isomorphic-fetch';
import * as React from 'react';
import * as moment from 'moment';
import * as redux from 'redux';
import * as reactredux from 'react-redux';
import { render }from 'react-dom';
import route from 'riot-route';

import * as common from './common';

type JournalState = {
  route: string
  entries?: Array<Entry> | null;
}

interface JournalAction {
  type: string
  entries?: Array<Entry> | null;
};

const reducer = (state: JournalState = {route: "Hello"}, action: JournalAction): JournalState => {
  switch(action.type) {
    case 'MOUNT_ENTRIES':
      console.log('MOUNT_ENTRIES CALLED');
      state.entries = action.entries;
      console.log(state);
      return state;
  }
  return state;
}

export const store = redux.createStore(reducer);

interface Entry extends common.Model {
  Date: string;
  Name: string;
  Body: string;
  LastBody: string;
}

class CEntry extends React.Component<{entry: Entry}, undefined> {
  render() {
    return <p>Journal entry for {this.props.entry.Date}</p>
  }
}

class Entries extends React.Component<{entries: Array<Entry>}, undefined> {
  render() {
    return <div>{this.props.entries.map((entry, i) => <CEntry key={i} entry={entry} />)}</div>
  }
}

class JournalRootComponent extends React.Component<JournalState, undefined> {
  render() { 
    console.log("RENDERING JOURNAL ROOT", this.props);
    return <p>{this.props.entries ? this.props.entries.length : 0}</p>
  }
}

const JournalRoot = reactredux.connect((state) => {
  
  return state;
})(JournalRootComponent);
//JournalRoot = reactredux.connect(JournalRoot);

document.addEventListener('DOMContentLoaded', () => {
  // Install router. If no route was specifically given, start with #view/YYYY-MM
  common.installRouter("/journal#", `view/${common.monthToString()}`, {
    view: (datestr: string, entry_scroll_id?: number) => {
      const date = common.monthFromString(datestr);

      // TODO: Update habits link to reflect current date
      fetch(`/journal/entries/date?date=${datestr}`).then((response:any) => {
        response.json().then((entries: any) => {
          const jaction:JournalAction = {type: "MOUNT_ENTRIES", entries: entries};
          console.log("DISPATCHING STORE ACTION ", jaction);
          store.dispatch(jaction);
          //render(<Entries entries={entries} />, document.getElementById('journal-root'));
        });
      })
    }
  });

  render(<reactredux.Provider store={store}><JournalRoot /></reactredux.Provider>, 
    document.getElementById('journal-root'));
});
