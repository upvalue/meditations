///<reference path="riot-route/index.d.ts" />

import * as MediumEditor from 'medium-editor';
import * as fetch from 'isomorphic-fetch';
import * as React from 'react';
import * as moment from 'moment';
import * as redux from 'redux';
import * as reactredux from 'react-redux';
import { render }from 'react-dom';
import route from 'riot-route';
import * as $ from 'jquery';

import thunk from 'redux-thunk';
import logger from 'redux-logger';

import * as common from './common';

type JournalState = {
  route: 'VIEW_MONTH';
  date: moment.Moment;
  entries?: Array<Entry> | null;
}

// Redux actions are described as a discriminated union
interface ViewMonth {
  type: 'VIEW_MONTH';
  date: moment.Moment;
  entries: Array<Entry>;
}

interface MountEntries {
  type: 'MOUNT_ENTRIES';
  entries: Array<Entry>;
}

interface ModifyEntry {
  type: 'MODIFY_ENTRY';
  entry: Entry;
};

type JournalAction = ViewMonth | MountEntries | ModifyEntry;


//type JournalActionType = 'MOUNT_ENTRIES' | 'MODIFY_ENTRY';

/*
interface JournalAction {
  type: string
  entries?: Array<Entry> | undefined;
  entry?: Entry;
};
*/

const initialState = {
  date: moment(new Date())
} as JournalState;

const reducer = (state: JournalState = initialState, action: JournalAction): JournalState => {
  switch(action.type) {
    case 'VIEW_MONTH':
      return {...state,
        route: 'VIEW_MONTH',
        date: action.date,
        entries: action.entries,
      };
    case 'MOUNT_ENTRIES':
      return {...state,
        entries: action.entries,
      };
    case 'MODIFY_ENTRY':
      const entries = (state.entries as Array<Entry>);
      const entry = (action.entry as Entry);
      // TODO: Linear search is inefficient; could build a map at mount time, but it may not really be necessary as the
      // UI seems speedy enough as is
      for(let i = 0; i != entries.length; i++) {
        if(entries[i].ID == entry.ID) {
          const mentries = entries.slice();
          Object.assign(mentries[i], entry);          
          return {...state, entries: mentries};
        }
      }
      break;
  }
  return state;
}

const store = redux.createStore(reducer, redux.applyMiddleware(thunk, logger));

interface Entry extends common.Model {
  Date: string;
  Name: string;
  Body: string;
  LastBody: string;
}

interface CEntryState { 
  editor: MediumEditor.MediumEditor
}

class CEntry extends React.Component<{entry: Entry}, {editor: MediumEditor.MediumEditor}> {
  body: HTMLElement;

  constructor() {
    super();
  }

  componentWillMount() {
    this.setState({});
  }

  changeName() {
    const name = window.prompt("What would you like to name this entry? (leave empty to delete)", this.props.entry.Name);
    $.post(`/journal/name-entry/${this.props.entry.ID}/${name}`);
  }


  editorCreate(e: React.MouseEvent<HTMLElement>) {
    e.preventDefault();
    if(!this.state.editor) {
      let editor = common.makeEditor(this.body, undefined, () => {
        common.request('/journal/update', {
          ID: this.props.entry.ID,
          Body: $(this.body).html()
        });
      });
      this.setState({editor: editor});
      $(this.body).focus();
    }
  }

  render() {
    return <div id={`entry-${this.props.entry.ID}`}>
      <span className="journal-controls float-right">
        <span className="float-right">
          <button className="journal-control btn btn-link btn-sm octicon octicon-text-size" title="Edit name"
            onClick={(e) => this.changeName()} />
        </span>
      </span>
      <span>Title: {this.props.entry.Name}</span>
      <div id={`entry-body-${this.props.entry.ID}`} className="entry-body"
        ref={(body) => {this.body = body; }} dangerouslySetInnerHTML={{__html: this.props.entry.Body}}
        onClick={(e) => this.editorCreate(e)} />
    </div>
  }
}

class Entries extends React.Component<{entries: Array<Entry>}, undefined> {
  render() {
    const res = Array<React.ReactElement<{key: number}> | CEntry>();
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
  navigate(method: 'add' | 'subtract', unit: 'month' | 'year') {
    const date = (this.props.date.clone()[method])(1, unit);
    route(`view/${common.monthToString(date)}`);
    /*
    store.dispatch(dispatch => {
      fetch(`/journal/entries/date?date=${common.monthToString(date)}`).then((response: any) => {
        response.json().then((entries: any) => {
          dispatch({type: 'VIEW_MONTH', entries: entries, date: date});
        });
      });
    });
    */
  }


  render() { 
    return <div>
      <button className="btn btn-link btn-sm octicon octicon-triangle-left" title="Last year"
        onClick={() => this.navigate('subtract', 'year')} />

      <button className="btn btn-link btn-sm octicon octicon-chevron-left" title="Previous month"
        onClick={() => this.navigate('subtract', 'month')} />

      <button className="btn btn-link btn-sm octicon octicon-chevron-right" title="Next month"
        onClick={() => this.navigate('add', 'month')} />

      <button className="btn btn-link btn-sm octicon octicon-triangle-right" title="Next year"
        onClick={() => this.navigate('add', 'year')} />

      {this.props.entries ? <Entries entries={this.props.entries} /> : <span></span>}
    </div>
  }
}

const JournalRoot = reactredux.connect((state) => {
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
      store.dispatch(dispatch => {
        fetch(`/journal/entries/date?date=${datestr}`).then((response:any) => {
          response.json().then((entries: any) => {
            dispatch({type: 'VIEW_MONTH', entries: entries, date: date} as JournalAction);
          });
        })
      });
    }
  });

  // Connect to web socket
  const socket = common.makeSocket("journal/sync", (entry: Entry) => {
    store.dispatch({type: 'MODIFY_ENTRY', entry: entry});
  });

});
