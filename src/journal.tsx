import * as MediumEditor from 'medium-editor';
import * as React from 'react';
import * as moment from 'moment';
import * as redux from 'redux';
import { Provider, connect } from 'react-redux';
import { render }from 'react-dom';
import route from 'riot-route';
import { Tab, Tabs, TabList, TabPanel } from'react-tabs';
import DatePicker from 'react-datepicker';

import * as common from './common';
import { SidebarState, JournalSidebar } from './journal-sidebar';

///// BACKEND INTERACTION

interface Tag {
  Name: string;
}

interface Entry extends common.Model {
  Date: moment.Moment;
  Name: string;
  Body: string;
  LastBody: string;
  Tags: ReadonlyArray<Tag> | undefined;
}

///// REDUX

interface ViewMonth extends common.CommonState {
  common: common.CommonState;
  route: 'VIEW_MONTH';
  date: moment.Moment;
  entries: Entry[];
  sidebar: SidebarState;
}

interface ViewTag extends common.CommonState {
  route: 'VIEW_TAG';
  tag: string;
  entries: Entry[];
  sidebar: SidebarState;
}

interface ViewNamedEntry extends common.CommonState {
  route: 'VIEW_NAMED_ENTRY';
  entries: Entry[];
  sidebar: SidebarState;
}

export type JournalState = ViewTag | ViewNamedEntry | ViewMonth;

type JournalAction = {
  type: 'VIEW_MONTH';
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
    case 'MOUNT_SIDEBAR': 
      return { ...state, sidebar: { ...state.sidebar, ...action.sidebar, mounted: true } };
    case 'VIEW_NAMED_ENTRY':
      return { ...state, route: 'VIEW_NAMED_ENTRY', entries: [action.entry] };
  }
  return state;
};


const [store, typedDispatch, thunkDispatch] = common.createStore(reducer, initialState);

///// REACT COMPONENTS

interface CEntryProps {
  context?: boolean;
  entry: Entry;
}

interface CEntryState {
  editor: MediumEditor.MediumEditor;
}

class CEntry extends common.Editable<CEntryProps> {
  changeName() {
    const name = window.prompt('What would you like to name this entry? (leave empty to delete)',
      this.props.entry.Name);
    if (name !== this.props.entry.Name) {
      common.post(typedDispatch, `/journal/name-entry/${this.props.entry.ID}/${name}`);
    }
  }

  addTag() {
    const tname = 
      window.prompt('What tag would you like to add to this entry? (leave empty to cancel)');
    // If input was empty or tag already exists, don't do anything
    if (tname === '' || tname === null || 
      (this.props.entry.Tags && this.props.entry.Tags.some(t => t.Name === tname))) {
      return;
    }
    
    common.post(typedDispatch, `/journal/add-tag/${this.props.entry.ID}/${tname}`);
  }

  removeTag(t: Tag)  {
    if (window.confirm(`Are you sure you want to remove the tag ${t.Name}`)) {
      common.post(typedDispatch, `/journal/remove-tag/${this.props.entry.ID}/${t.Name}`);
    }
  }

  deleteEntry() {
    if (window.confirm('Are you sure you want to remove this entry?')) {
      common.post(typedDispatch, `/journal/delete-entry/${this.props.entry.ID}`);      
    }
  }

  editorUpdated() {
    return this.props.entry.Body !== this.body.innerHTML;
  }

  editorSave() {
    common.post(typedDispatch, '/journal/update', {
      ID: this.props.entry.ID,
      Body: this.body.innerHTML,
    });
  }

  btnClass(title: string) {
    return `journal-control btn btn-link btn-sm octicon octicon-${title}`;
  }

  render() {
    let tags : ReadonlyArray<React.ReactElement<undefined>> = [];
    if (this.props.entry.Tags) {
      tags = this.props.entry.Tags.map((t, i) =>
        <div key={i}>
          <em><a href={`#tag/${t.Name}`}>#{t.Name}</a></em>
          <button className="btn btn-xs octicon octicon-x" title="Remove tag"
            onClick={e => this.removeTag(t)} />
        </div>,
      );
    }

    // A link to the entry's monthly context; 
    const ctxLink = 
      `#view/${this.props.entry.CreatedAt.format(common.MONTH_FORMAT)}/${this.props.entry.ID}`;

    return <div id={`entry-${this.props.entry.ID}`}>
      <h5>
      #{this.props.entry.ID} {this.props.entry.Name && <strong>{this.props.entry.Name}</strong>}
        <span className="journal-controls float-right">
          <span className="float-right">
            {!this.props.context ?  // context button
              <a className={this.btnClass('link')} title="Go to month"
                href={ctxLink} /> : '' }
            <button className={this.btnClass('text-size')} title="Edit name"
              onClick={e => this.changeName()} />
            <button className={this.btnClass('tag')} title="Add tag"
              onClick={e => this.addTag()} />
            <button className={this.btnClass('x')} title="Delete entry"
              onClick={e => this.deleteEntry()} />

          </span>
          <div className="journal-timestamp float-right">
            <em><a href={ctxLink}>{
              this.props.entry.CreatedAt.format(this.props.context ? 'h:mm A'  : 'M-D-YY h:mm A')
            }</a></em>
          </div>
          <div className="journal-tags float-right">
            {tags}
          </div>
        </span>
      </h5>
      <div id={`entry-body-${this.props.entry.ID}`} className="entry-body"
        ref={(body) => { if (body) this.body = body; }}
        dangerouslySetInnerHTML={{ __html: this.props.entry.Body }}
        onClick={e => this.editorOpen(e)} />
    </div>;
  }
}

// TODO: SFC
class BrowseMonth extends React.PureComponent<{date: moment.Moment, entries: Entry[]}, {}> {
  navigate(method: 'add' | 'subtract', unit: 'month' | 'year') {
    const date = (this.props.date.clone()[method])(1, unit);
    route(`view/${date.format(common.MONTH_FORMAT)}`);
  }

  render() {
    const res = Array<React.ReactElement<{key: number}> | CEntry>();
    let lastDate : moment.Moment | null = null;
    let key = 0;
    this.props.entries.forEach((e) => {
      if (!lastDate || (lastDate.format(common.DAY_FORMAT) !== e.Date.format(common.DAY_FORMAT))) {
        lastDate = e.Date;
        // Add a nicely formatted and linky date header for each day with entries
        key += 1;
        res.push(<h5 key={key}>
          {lastDate.format('dddd')}, {' '}
          <a href={`view/${lastDate.format(common.MONTH_FORMAT)}/${e.ID}`}>
            {lastDate.format('MMMM')}
          </a>{' '}
          {lastDate.format('Do')}
        </h5>);
      }
      key += 1;
      res.push(<CEntry context={true} key={key} entry={e} />);
      key += 1;
      res.push(<hr key={key} />);
    });

    return <div>
      <button className="btn btn-link btn-sm octicon octicon-triangle-left" title="Last year"
        onClick={() => this.navigate('subtract', 'year')} />

      <button className="btn btn-link btn-sm octicon octicon-chevron-left" title="Previous month"
        onClick={() => this.navigate('subtract', 'month')} />
        
      <h3 id="entries-title">{this.props.date.format('MMMM YYYY')}</h3>

      <button className="btn btn-link btn-sm octicon octicon-chevron-right" title="Next month"
        onClick={() => this.navigate('add', 'month')} />

      <button className="btn btn-link btn-sm octicon octicon-triangle-right" title="Next year"
        onClick={() => this.navigate('add', 'year')} />

      {res}
    </div>;
  }
}

// tslint:disable-next-line:variable-name
const ViewEntry = (props: {entry: Entry | null}) => {
  return props.entry ? <CEntry context={false} entry={props.entry} /> : <p>Entry deleted</p>;
};

class BrowseTag extends React.PureComponent<{tagName: string, entries: Entry[]}, {}> {
  render() {
    const entries: React.ReactElement<undefined>[] = [];
    let key = 0;
    this.props.entries.forEach((e) => {
      entries.push(<CEntry context={false} key={key} entry={e} />);
      key += 1;
      entries.push(<hr key={key} />);
      key += 1;
    });
    return <div>
      <h3>#{this.props.tagName}</h3>
      {entries}
    </div>;
  }
}

// tslint:disable-next-line:variable-name
const JournalNavigation = connect(state => state)
(class extends React.PureComponent<JournalState, {}> {
  createEntry(date: moment.Moment | null) {
    if (date !== null) {
      common.post(typedDispatch, `/journal/new?date=${date.format(common.DAY_FORMAT)}`, {});
    }
  }

  search(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    // common.post(typedDispatch, `/journal/search?string=`)
  }

  render() {
    return <div className="d-flex flex-column flex-md-row flex-justify-between">
      <h1>journal</h1>
      <form className="form-inline" style={{ display: 'inline' }}
        onSubmit={e => this.search(e)}>
          <DatePicker className="form-control" onChange={date => this.createEntry(date)} 
            placeholderText="Click to add new entry" />
          <input type="text" className="form-control" placeholder="Text to search for" />
          <button className="btn btn-sm btn-primary">Search for text</button>
        </form>
      </div>;
  }
});

// tslint:disable-next-line:variable-name
const JournalRoot = common.connect()(class extends React.PureComponent<JournalState, {}> {
  render() { 
    return <common.CommonUI {...this.props}>
      <div className="d-flex flex-column flex-md-row flex-justify-between">
        <div id="journal-sidebar">
          <JournalSidebar />
        </div>

        <div id="journal-main">
          <JournalNavigation />
          {this.props.route === 'VIEW_MONTH' ?
            <BrowseMonth date={this.props.date} entries={this.props.entries} /> : <span></span>}
          {this.props.route === 'VIEW_TAG' ?
            <BrowseTag tagName={this.props.tag} entries={this.props.entries} /> : <span></span>}
          {this.props.route === 'VIEW_NAMED_ENTRY' ?
            <ViewEntry entry={this.props.entries.length === 0 ? null
              : this.props.entries[0]} /> : ''}
        </div>
      </div>
    </common.CommonUI>;
  }
});

export const main = () => {
  ///// ROUTES
  // Install router. If no route was specifically given, start with #view/YYYY-MM
  common.installRouter('/journal#', `view/${moment().format(common.MONTH_FORMAT)}`, {
    no_action: () => route(`view/${moment().format(common.MONTH_FORMAT)}`),
    journal: () => null, // Dummy, called if journal is clicked from navbar

    view: (datestr: string, entryScrollId?: number) => {
      const date = moment(datestr, common.MONTH_FORMAT);

      common.setTitle('Journal', `${date.format('MMMM YYYY')}`);

      // TODO: Update habits link to reflect current date
      thunkDispatch((dispatch) => {
        common.get(dispatch, `/journal/entries/date?date=${datestr}`, ((entries: Entry[]) => {
          entries.forEach(common.processModel);
          dispatch({ date, entries, type: 'VIEW_MONTH' });
        }));
      });

      thunkDispatch((dispatch) => {
        common.get(dispatch, `/journal/entries/date?date=${datestr}`, ((entries: Entry[]) => {
          entries.forEach(common.processModel);
          dispatch({ date, entries, type: 'VIEW_MONTH' });
        }));
      });
    },

    tag: (tagname: string) => {
      common.setTitle('Journal', `Tag #${tagname}`);
      thunkDispatch((dispatch) => {
        common.get(dispatch, `/journal/entries/tag/${tagname}`, ((entries: Entry[]) => {
          entries.forEach(common.processModel);
          dispatch({ entries, type: 'VIEW_TAG', tag: tagname });
        }));
      });
    },
    
    name: (name: string) => {
      common.setTitle('Journal', `${name}`);
      thunkDispatch((dispatch) => {
        common.get(dispatch, `/journal/entries/name/${name}`, (entry: Entry) => {
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
  };

  const socket = common.makeSocket(typedDispatch, 'journal/sync', (msg: JournalMessage) => {
    if (msg.Type === 'UPDATE_ENTRY') {
      common.processModel(msg.Datum);
      typedDispatch({ type: 'UPDATE_ENTRY', entry: msg.Datum });
    } else if (msg.Type === 'DELETE_ENTRY') {
      typedDispatch({ type: 'DELETE_ENTRY', ID: msg.Datum });
    } else if (msg.Type === 'CREATE_ENTRY') {
      common.processModel(msg.Datum);
      // TODO: View change?
      // TODO: Dispatch view change
      typedDispatch({ type: 'CREATE_ENTRY', entry: msg.Datum });
    } else if (msg.Type === 'SIDEBAR') {
      typedDispatch({ type: 'MOUNT_SIDEBAR', sidebar: msg.Datum });
    } 
  }, () => {
    ///// RENDER 
    // After socket connects
    common.render('journal-root', store, <JournalRoot />);

    // Fetch sidebar
    common.post(typedDispatch, '/journal/sidebar');
  });
};
