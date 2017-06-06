
import * as MediumEditor from 'medium-editor';
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
  entries: Array<Entry>;
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

interface DeleteEntry {
  type: 'DELETE_ENTRY';
  ID: number;
};

type JournalAction = ViewMonth | MountEntries | ModifyEntry | DeleteEntry;

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
    case 'DELETE_ENTRY': {
      return {...state,
        entries: state.entries.slice().filter((v) => v.ID != action.ID)
      }
    }
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

class CEntry extends React.Component<{context?: boolean, entry: Entry}, {editor: MediumEditor.MediumEditor}> {
  body: HTMLElement;

  constructor() {
    super();
  }

  componentWillMount() {
    this.setState({});
  }

  changeName() {
    const name = window.prompt("What would you like to name this entry? (leave empty to delete)", this.props.entry.Name);
    if(name != this.props.entry.Name) {
      $.post(`/journal/name-entry/${this.props.entry.ID}/${name}`);
    }
  }

  deleteEntry() {
    if(window.confirm("Are you sure you want to remove this entry?")) {
      $.post(`/journal/delete-entry/${this.props.entry.ID}`);      
    }
  }

  editorCreate(e: React.MouseEvent<HTMLElement>) {
    e.preventDefault();
    if(!this.state.editor) {
      let editor = common.makeEditor(this.body, undefined, () => {
        const newBody = $(this.body).html();

        // Do not update if nothign has changed
        if(newBody == this.props.entry.Body) {
          return;
        }

        common.request('/journal/update', {
          ID: this.props.entry.ID,
          Body: newBody
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
          <button className="journal-control btn btn-link btn-sm octicon octicon-x" title="Delete entry"
            onClick={(e) => this.deleteEntry()} />
        </span>
        <div className="journal-timestamp float-right">
          <a href={`#view/${common.momentToMonth(common.monthToMoment(this.props.entry.CreatedAt))}/${this.props.entry.ID}`}>{
            common.createdAtToMoment(this.props.entry).format(this.props.context ? 'hh:mm A'  : 'M-D-YY hh:mm A')
          }</a>
        </div>
      </span>
      <span>Title: {this.props.entry.Name}</span>
      <div id={`entry-body-${this.props.entry.ID}`} className="entry-body"
        ref={(body) => {this.body = body; }} dangerouslySetInnerHTML={{__html: this.props.entry.Body}}
        onClick={(e) => this.editorCreate(e)} />
    </div>
  }
}

// TODO: SFC
class ViewMonth extends React.Component<{date: moment.Moment, entries: Array<Entry>}, undefined> {
  navigate(method: 'add' | 'subtract', unit: 'month' | 'year') {
    const date = (this.props.date.clone()[method])(1, unit);
    route(`view/${common.momentToMonth(date)}`);
  }

  render() {
    const res = Array<React.ReactElement<{key: number}> | CEntry>();
    let last_date : string = "";
    let key = 0;
    // TODO: There must be a better way to do this.
    for(let i = 0; i != this.props.entries.length; i++) {
      // Insert date headers for each day present
      const entry = this.props.entries[i];
      if(last_date != entry.Date) {
        last_date = entry.Date;
        const m = moment(entry.Date, 'YYYY-MM-DD');
        res.push(<h1 key={key}>{m.format('YYYY-MM-DD')}</h1>);
        key++;
      }
      res.push(<CEntry context={true} key={key} entry={entry} />);
      key++;
    }

    return <div>
      <button className="btn btn-link btn-sm octicon octicon-triangle-left" title="Last year"
        onClick={() => this.navigate('subtract', 'year')} />

      <button className="btn btn-link btn-sm octicon octicon-chevron-left" title="Previous month"
        onClick={() => this.navigate('subtract', 'month')} />

      <button className="btn btn-link btn-sm octicon octicon-chevron-right" title="Next month"
        onClick={() => this.navigate('add', 'month')} />

      <button className="btn btn-link btn-sm octicon octicon-triangle-right" title="Next year"
        onClick={() => this.navigate('add', 'year')} />

      {res}
    </div>
  }
}

class JournalRootComponent extends React.Component<JournalState, undefined> {
  render() { 
    return <div>
      {this.props.route == 'VIEW_MONTH' ? <ViewMonth date={this.props.date} entries={this.props.entries} /> : <span></span>}
    </div>
  }
}

const JournalRoot = reactredux.connect((state) => {
  return state;
})(JournalRootComponent);

document.addEventListener('DOMContentLoaded', () => {
  render(<reactredux.Provider store={store}><JournalRoot /></reactredux.Provider>, 
    document.getElementById('journal-root'));

  // Install router. If no route was specifically given, start with #view/YYYY-MM
  common.installRouter("/journal#", `view/${common.momentToMonth()}`, {
    view: (datestr: string, entry_scroll_id?: number) => {
      const date = common.monthToMoment(datestr);

      // TODO: Update habits link to reflect current date
      store.dispatch(dispatch => {
        window.fetch(`/journal/entries/date?date=${datestr}`).then((response:any) => {
          // TODO: Scrolling
          response.json().then((entries: any) => {
            dispatch({type: 'VIEW_MONTH', entries: entries, date: date} as JournalAction);
          });
        })
      });
    }
  });

  // Connect to websocket
  type JournalMessage = {
    Type: 'MODIFY_ENTRY';
    Datum: Entry;
  } | {
    Type: 'DELETE_ENTRY';
    Datum: number;
  }

  const socket = common.makeSocket("journal/sync", (msg: JournalMessage) => {
    console.log("WebSocket message",msg);
    if(msg.Type == 'MODIFY_ENTRY') {
      store.dispatch({type: 'MODIFY_ENTRY', entry: msg.Datum});
    } else if(msg.Type == 'DELETE_ENTRY') {
      store.dispatch({type: 'DELETE_ENTRY', ID: msg.Datum});
    }
  });
});
