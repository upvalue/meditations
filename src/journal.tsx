///<reference path="riot-route/index.d.ts" />

import * as fetch from 'isomorphic-fetch';
import * as React from 'react';
import * as moment from 'moment';
import * as redux from 'redux';
import * as reactredux from 'react-redux';
import reduxThunk from 'redux-thunk';
import { render }from 'react-dom';
import route from 'riot-route';
import * as $ from 'jquery';

import * as common from './common';

type JournalState = {
  route: string
  entries?: Array<Entry> | null;
}

type JournalActionType = 'MOUNT_ENTRIES' | 'MODIFY_ENTRY';

interface JournalAction {
  type: string
  entries?: Array<Entry> | undefined;
  entry?: Entry;
};

const reducer = (state: JournalState = {route: "Hello"}, action: JournalAction): JournalState => {
  switch(action.type) {
    case 'MOUNT_ENTRIES':
      console.log('MOUNT_ENTRIES CALLED');
      return {...state,
        entries: action.entries,
      };
    case 'MODIFY_ENTRY':
      const entries = (state.entries as Array<Entry>).slice();
      const entry = (action.entry as Entry);
      for(let i = 0; i != entries.length; i++) {
        if(entries[i].ID == entry.ID) {
          Object.assign(entries[i], entry);          
        }
      }
      return {...state,
        entries: entries
      }
  }
  return state;
}

const store = redux.createStore(reducer, redux.applyMiddleware(reduxThunk));

interface Entry extends common.Model {
  Date: string;
  Name: string;
  Body: string;
  LastBody: string;
}

class CEntry extends React.Component<{entry: Entry}, undefined> {
  constructor() {
    super();
    this.changeName = this.changeName.bind(this);
  }

  changeName() {
    const name = window.prompt("What would you like to name this entry? (leave empty to delete)", this.props.entry.Name);

    $.post(`/journal/name-entry/${this.props.entry.ID}/${name}`);
    // So now what?
    console.log(name);
  }

  render() {
    console.log(this.props.entry);
    return <div id={`entry-${this.props.entry.ID}`}>
      <span className="journal-controls float-right">
        <span className="float-right">
          <button className="journal-control btn btn-link btn-sm octicon octicon-text-size" title="Edit name"
            onClick={this.changeName} />
        </span>
      </span>
      <span>Title: {this.props.entry.Name}</span>
      <div id={`entry-body-${this.props.entry.ID}`} className="entry-body"
        dangerouslySetInnerHTML={{__html: this.props.entry.Body}}>
      </div>
    </div>
  }
}

type DateTitleProps = {key: number, title: string};
type DateTitleSFC = React.SFC<DateTitleProps>; 

const DateTitle: DateTitleSFC = ({key, title}) => { 
  return <h1 key={key}>{title}</h1>
};


class Entries extends React.Component<{entries: Array<Entry>}, undefined> {
  render() {
    const res = Array<React.ReactElement<DateTitleProps> | CEntry>();
    let last_date : string = "";
    let key = 0;
    for(let i = 0; i != this.props.entries.length; i++) {
      // Insert date headers for each day present
      const entry = this.props.entries[i];
      if(last_date != entry.Date) {
        last_date = entry.Date;
        const m = moment(entry.Date, 'YYYY-MM-DD');
        res.push(<h1 key={key}>{m.format('YYYY-MM-DD')}</h1>);
        key++;
      }
      res.push(<CEntry key={key} entry={entry} />);
      key++;
    }
    // TODO: Add dates in
    return <div>{res}</div>
  }
}

class JournalRootComponent extends React.Component<JournalState, undefined> {
  render() { 
    console.log("RENDERING JOURNAL ROOT", this.props);
    
    return <div>
      {this.props.entries ? <Entries entries={this.props.entries} /> : <span></span>}
    </div>
  }
}

const JournalRoot = reactredux.connect((state) => {
  console.log("Map state", state);
  
  return state;
})(JournalRootComponent);
//JournalRoot = reactredux.connect(JournalRoot);

document.addEventListener('DOMContentLoaded', () => {
  render(<reactredux.Provider store={store}><JournalRoot /></reactredux.Provider>, 
    document.getElementById('journal-root'));

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

  // Connect to web socket
  const socket = common.makeSocket("journal/sync", (entry: Entry) => {
    store.dispatch({type: 'MODIFY_ENTRY', entry: entry});
  });

});
