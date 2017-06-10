import * as MediumEditor from 'medium-editor';
import * as React from 'react';
import * as moment from 'moment';
import * as redux from 'redux';
import {Provider, connect} from 'react-redux';
import { render }from 'react-dom';
import route from 'riot-route';
import {Tab, Tabs, TabList, TabPanel} from'react-tabs';
import DatePicker from 'react-datepicker';

import * as common from './common';
import {SidebarState, JournalSidebar} from './journal-sidebar';


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
  entries: Array<Entry>;
  sidebar: SidebarState;
}

interface ViewTag extends common.CommonState {
  route: 'VIEW_TAG';
  tag: string;
  entries: Array<Entry>;
  sidebar: SidebarState;
}

interface ViewNamedEntry extends common.CommonState {
  route: 'VIEW_NAMED_ENTRY';
  entries: Array<Entry>;
  sidebar: SidebarState;
}

type JournalState = ViewTag | ViewNamedEntry | ViewMonth;

type JournalDispatch = redux.Dispatch<JournalState>;

type JournalAction = {
  type: 'VIEW_MONTH';
  date: moment.Moment;
  entries: Array<Entry>;  
} | {
  type: 'MOUNT_ENTRIES';
  entries: Array<Entry>;
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
  entries: Array<Entry>;
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
  sidebar: {mounted: false}
} as JournalState;

const reducer = (state: JournalState = initialState, action: JournalAction): JournalState => {
  state = common.commonReducer(state, action as common.CommonAction) as JournalState;
  switch(action.type) {
    case 'VIEW_MONTH':
      return {...state,
        route: 'VIEW_MONTH',
        date: action.date,
        entries: action.entries,
      } as ViewMonth;
    case 'VIEW_TAG':
      return {...state, route: 'VIEW_TAG', tag: action.tag, entries: action.entries} as ViewTag;
    case 'MOUNT_ENTRIES':
      return {...state,
        entries: action.entries,
      };
    case 'CREATE_ENTRY':
      let entries = state.entries.slice();
      for(let i = 0; i != entries.length; i++) {
        //console.log(entries[i].Date, action.entry.Date);
        if(entries[i].Date > action.entry.Date) {
          console.log("Splicing in entry at ",i);
          entries = entries.splice(i, 0, action.entry);
          return {...state, entries: entries}
        }
      }
      entries.unshift(action.entry);
      return {...state, entries: entries}
    case 'UPDATE_ENTRY':
      // TODO: Iterating over all entries to do these things is a little inefficient, but it probably doesn't matter as
      // long as the UI is snappy. Alternative would be building a map of IDs at render-time
      return {...state,
        entries: state.entries.slice().map((v) => v.ID == action.entry.ID ? action.entry : v)
      };
    case 'DELETE_ENTRY':
      return {...state,
        entries: state.entries.slice().filter((v) => v.ID != action.ID)
      };
    case 'MOUNT_SIDEBAR': 
      return {...state, sidebar: {...state.sidebar, ...action.sidebar, mounted: true}};
    case 'VIEW_NAMED_ENTRY':
      return {...state, route: 'VIEW_NAMED_ENTRY', entries: [action.entry]};
  };
  return state;
}

const store = common.makeStore(reducer);

///// REACT COMPONENTS

class CEntry extends React.Component<{context?: boolean, entry: Entry}, {editor: MediumEditor.MediumEditor}> {
  body: HTMLElement;

  componentWillMount() {
    this.setState({});
  }

  changeName() {
    const name = window.prompt("What would you like to name this entry? (leave empty to delete)", this.props.entry.Name);
    if(name != this.props.entry.Name) {
      common.post(store.dispatch, `/journal/name-entry/${this.props.entry.ID}/${name}`);
    }
  }

  addTag() {
    const tname = window.prompt("What tag would you like to add to this entry? (leave empty to cancel)");
    // If input was empty or tag already exists, don't do anything
    if(tname == '' || (this.props.entry.Tags && this.props.entry.Tags.some((t) => t.Name == tname))) {
      return;
    }
    
    common.post(store.dispatch, `/journal/add-tag/${this.props.entry.ID}/${tname}`);
  }

  removeTag(t: Tag)  {
    if(window.confirm(`Are you sure you want to remove the tag ${t.Name}`)) {
      common.post(store.dispatch, `/journal/remove-tag/${this.props.entry.ID}/${t.Name}`);
    }
  }

  deleteEntry() {
    if(window.confirm("Are you sure you want to remove this entry?")) {
      common.post(store.dispatch, `/journal/delete-entry/${this.props.entry.ID}`);      
    }
  }

  editorCreate(e: React.MouseEvent<HTMLElement>) {
    e.preventDefault();
    if(!this.state.editor) {
      let editor = common.makeEditor(this.body, undefined, () => {
        const newBody = this.body.innerHTML;

        // Do not update if  has changed
        if(newBody == this.props.entry.Body) {
          return;
        }

        common.post(store.dispatch, '/journal/update', {
          ID: this.props.entry.ID,
          Body: newBody
        });
      });
      this.setState({editor: editor});
      this.body.focus();
    }
  }

  render() {
    let tags : ReadonlyArray<React.ReactElement<undefined>> = [];
    if(this.props.entry.Tags) {
      tags = this.props.entry.Tags.map((t, i) =>
        <div key={i}>
          <em><a href={`#tag/${t.Name}`}>#{t.Name}</a></em>
          <button className="btn btn-xs octicon octicon-x" title="Remove tag"
            onClick={(e) => this.removeTag(t)} />
        </div>
      );
    }

    return <div id={`entry-${this.props.entry.ID}`}>
      <h5>
        <span className="journal-controls float-right">
          <span className="float-right">
            {!this.props.context ?  // context button
              <a className="journal-control btn btn-link btn-sm octicon octicon-link" title="Go to month"
                href={`#view/${this.props.entry.CreatedAt.format(common.MONTH_FORMAT)}/${this.props.entry.ID}`} /> : "" }
            <button className="journal-control btn btn-link btn-sm octicon octicon-text-size" title="Edit name"
              onClick={(e) => this.changeName()} />
            <button className="journal-control btn btn-link btn-sm octicon octicon-tag" title="Add tag"
              onClick={(e) => this.addTag()} />
            <button className="journal-control btn btn-link btn-sm octicon octicon-x" title="Delete entry"
              onClick={(e) => this.deleteEntry()} />

          </span>
          <div className="journal-timestamp float-right">
            <em><a href={`#view/${this.props.entry.CreatedAt.format(common.MONTH_FORMAT)}/${this.props.entry.ID}`}>{
              this.props.entry.CreatedAt.format(this.props.context ? 'hh:mm A'  : 'M-D-YY hh:mm A')
            }</a></em>
          </div>
          <div className="journal-tags float-right">
            {tags}
          </div>
        </span>
      {this.props.entry.Name ? <strong>{this.props.entry.Name}</strong> : ''}
      </h5>
      <div id={`entry-body-${this.props.entry.ID}`} className="entry-body"
        ref={(body) => {this.body = body; }} dangerouslySetInnerHTML={{__html: this.props.entry.Body}}
        onClick={(e) => this.editorCreate(e)} />
    </div>
  }
}

// TODO: SFC
class BrowseMonth extends React.Component<{date: moment.Moment, entries: Array<Entry>}, undefined> {
  navigate(method: 'add' | 'subtract', unit: 'month' | 'year') {
    const date = (this.props.date.clone()[method])(1, unit);
    route(`view/${date.format(common.MONTH_FORMAT)}`);
  }

  render() {
    const res = Array<React.ReactElement<{key: number}> | CEntry>();
    let last_date : moment.Moment | null = null;
    let key = 0;
    this.props.entries.forEach((e) => {
      if(!last_date || (last_date.format(common.DAY_FORMAT) != e.Date.format(common.DAY_FORMAT))) {
        last_date = e.Date;
        // Add a nicely formatted and linky date header for each day with entries
        res.push(<h5 key={key++}>
          {last_date.format("dddd")}, {" "}
          <a href={`view/${last_date.format(common.MONTH_FORMAT)}/${e.ID}`}>{last_date.format('MMMM')}</a>{" "}
          {last_date.format('Do')}
        </h5>);
      }
      res.push(<CEntry context={true} key={key++} entry={e} />);
      res.push(<hr key={key++} />);
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
    </div>
  }
}

const ViewEntry = (props: {entry: Entry | null}) => {
  return props.entry ? <CEntry context={false} entry={props.entry} /> : <p>Entry deleted</p>
}

class BrowseTag extends React.Component<{tagName: string, entries: Array<Entry>}, undefined> {
  render() {
    let entries: Array<React.ReactElement<undefined>> = [], key = 0;
    this.props.entries.forEach((e) => {
      entries.push(<CEntry context={false} key={key++} entry={e} />);
      entries.push(<hr key={key++} />);
    });
    return <div>
      <h3>#{this.props.tagName}</h3>
      {entries}
    </div>
  }
}

const JournalRoot = common.connect()(class extends React.Component<JournalState, undefined> {
  render() { 
    return <div>
      <div>
        {this.props.route == 'VIEW_MONTH' ? <BrowseMonth date={this.props.date} entries={this.props.entries} /> : <span></span>}
        {this.props.route == 'VIEW_TAG' ? <BrowseTag tagName={this.props.tag} entries={this.props.entries} /> : <span></span>}
        {this.props.route == 'VIEW_NAMED_ENTRY' ? <ViewEntry entry={this.props.entries.length == 0 ? null : this.props.entries[0]} /> : ''}
      </div>
    </div>
  }
});

const JournalNavigation = connect((state) => state)(
  class extends React.Component<JournalState, undefined> {
    createEntry(date: moment.Moment | null) {
      if(date != null) {
        common.post(store.dispatch, `/journal/new?date=${date.format(common.DAY_FORMAT)}`, {});
      }
    }

    render() {
      return <span>
        <DatePicker className="form-control" onChange={(date) => this.createEntry(date)} 
          placeholderText="Click to add new entry" />
      </span>
    }
  }
);


document.addEventListener('DOMContentLoaded', () => {
  ///// ROUTES
  // Install router. If no route was specifically given, start with #view/YYYY-MM
  common.installRouter("/journal#", `view/${moment().format(common.MONTH_FORMAT)}`, {
    view: (datestr: string, entry_scroll_id?: number) => {
      const date = moment(datestr, common.MONTH_FORMAT)

      // TODO: Update habits link to reflect current date
      store.dispatch((dispatch: JournalDispatch) => {
        common.get(dispatch, `/journal/entries/date?date=${datestr}`, ((entries: Array<Entry>) => {
          entries.forEach(common.processModel);
          dispatch({type: 'VIEW_MONTH', entries: entries, date: date} as JournalAction);
        }));
      });
    },

    tag: (tagname: string) => {
      store.dispatch((dispatch: JournalDispatch) => {
        common.get(dispatch, `/journal/entries/tag/${tagname}`, ((entries: Array<Entry>) => {
          entries.forEach(common.processModel);
          dispatch({type: 'VIEW_TAG', entries: entries, tag: tagname} as JournalAction);
        }));
      });
    },
    
    name: (name: string) => {
      store.dispatch((dispatch: JournalDispatch) => {
        common.get(dispatch, `/journal/entries/name/${name}`, (entry: Entry) => {
          common.processModel(entry);
          dispatch({type: 'VIEW_NAMED_ENTRY', entry: entry} as JournalAction);
        });
        // TODO: Error display
      });
    }
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
  }

  const socket = common.makeSocket("journal/sync", (msg: JournalMessage) => {
    console.log("WebSocket message",msg);
    if(msg.Type == 'UPDATE_ENTRY') {
      common.processModel(msg.Datum);
      store.dispatch({type: 'UPDATE_ENTRY', entry: msg.Datum} as JournalAction);
    } else if(msg.Type == 'DELETE_ENTRY') {
      store.dispatch({type: 'DELETE_ENTRY', ID: msg.Datum} as JournalAction);
    } else if(msg.Type == 'CREATE_ENTRY') {
      common.processModel(msg.Datum);
      // TODO: Dispatch view change
      //store.dispatch({type: 'VIEW_MONTH', date: msg.Datum.Date.format(common.MONTH_FORMAT)})
      store.dispatch({type: 'CREATE_ENTRY', entry: msg.Datum} as JournalAction);
    } else if(msg.Type == 'SIDEBAR') {
      store.dispatch({type: 'MOUNT_SIDEBAR', sidebar: msg.Datum} as JournalAction);
    } 
  });
  
  ///// RENDER 
  common.render('journal-root', store, <JournalRoot />)
  common.render('navigation-root', store, <JournalNavigation />)
  common.render('journal-sidebar', store, <JournalSidebar />)

  // Fetch sidebar
  common.post(store.dispatch, '/journal/sidebar');
});
