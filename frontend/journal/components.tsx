import * as MediumEditor from 'medium-editor';
import * as React from 'react';
import * as moment from 'moment';
import * as redux from 'redux';
import { Provider, connect } from 'react-redux';
import { render }from 'react-dom';
import route from 'riot-route';
import { Tab, Tabs, TabList, TabPanel } from'react-tabs';
import DatePicker from 'react-datepicker';
import * as Autosuggest from 'react-autosuggest';

import * as common from '../common';
import { TimeNavigator, OcticonButton, Editable, CommonUI } from '../common/components';

import { store, dispatch, JournalState, Entry, Tag } from './state';
import { SidebarState, JournalSidebar } from './sidebar';

///// REACT COMPONENTS

interface CEntryProps {
  /** If true, a link to the month the entry was created in will be added to the controls. */
  context?: boolean;
  entry: Entry;
  /** A search string to highlight */
  searchString?: string;
}

interface CEntryState {
  editor: MediumEditor.MediumEditor;
}

/** A journal entry. */
class CEntry extends Editable<CEntryProps> {
  changeName() {
    common.modalPromptAllowEmpty('What would you like to name this entry? (leave empty to delete)',
      'Name entry', this.props.entry.Name,
    (name) => {
      if (name !== this.props.entry.Name) {
        if (name === '') {
          common.post(`/journal/name-entry/${this.props.entry.ID}`);
        } else {
          common.post(`/journal/name-entry/${this.props.entry.ID}/${name}`);
        }
      }
    });
  }

  addTag() {
    common.modalPrompt(
      'What tag would you like to add to this entry? (leave empty to cancel)', 'Tag entry',
    (tname) => {
    // If input was empty or tag already exists, don't do anything
      if (tname === '' || tname == null ||
        (this.props.entry.Tags && this.props.entry.Tags.some(t => t.Name === tname))) {
        return;
      }

      common.post(`/journal/add-tag/${this.props.entry.ID}/${tname}`);
    });
  }

  removeTag(t: Tag)  {
    common.modalConfirm(`Are you sure you want to remove the tag #${t.Name}?`, 'Yes, remove it',
      () => common.post(`/journal/remove-tag/${this.props.entry.ID}/${t.Name}`));
  }

  deleteEntry() {
    common.modalConfirm('Are you sure you want to remove this entry?', 'Yes, remove it',
      () => common.post(`/journal/delete-entry/${this.props.entry.ID}`));
  }

  editorUpdated() {
    return this.props.entry.Body !== this.body.innerHTML;
  }

  editorSave() {
    common.post('/journal/update', {
      ID: this.props.entry.ID,
      Body: this.body.innerHTML,
    });
  }

  btnClass(title: string) {
    return `journal-control btn btn-link btn-sm octicon octicon-${title}`;
  }

  render() {
    // Create an array of tag links
    let tags : ReadonlyArray<React.ReactElement<undefined>> = [];
    if (this.props.entry.Tags) {
      tags = this.props.entry.Tags.map((t, i) =>
        <button className="mt-4 mt-md-0 ml-md-3  tag " key={i} style={{ borderRadius: '1px' }} >
          <a href={`#tag/${t.Name}`}  >#{t.Name}</a>
          <span className="octicon octicon-x ml-1" onClick={() => this.removeTag(t)} />
        </button>,
      );
    }

    // A link to the month the entry was written, if viewing in a non time based context (e.g. by
    // name or by tag)
    const ctxLink = this.props.context ? 
      // tslint:disable-next-line
      `#view/${this.props.entry.CreatedAt.local().format(common.MONTH_FORMAT)}/${this.props.entry.ID}` :
      false;

    // In order, render:
    // A header with title and title-changing control, then tags
    // Other controls and timestamp on the rightmost
    
    let body = this.props.entry.Body;

    if (this.props.searchString) {
      const esc = this.props.searchString.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const reg = new RegExp(esc, 'ig');
      body = body.replace(reg, 
        `<span class="entry-highlight">${this.props.searchString}</span>`);
    }



    return <section className="entry border bg-gray " id={`entry-${this.props.entry.ID}`}>
      <div className="entry-header border-bottom">
        <div className="d-flex flex-row flex-justify-between flex-items-center">
          <div className="d-flex flex-row flex-items-center ml-2 mb-1 mt-1" >
            <OcticonButton name="text-size" onClick={() => this.changeName()}
              tooltip="Change name" tooltipDirection="e" octiconClass="p-1 mr-2" />
            <h3 className="ml-1 d-flex flex-column flex-md-row" style={{ display: 'inline' }}>

              <span className="d-flex flex-column flex-md-row">
              #{this.props.entry.ID}&nbsp;
              <span>{this.props.entry.Name && <strong>{this.props.entry.Name}</strong>}</span>
              </span>
            </h3>

            <div className="ml-2 d-flex flex-md-row flex-column" style={{ display: 'inline' }}>
              <OcticonButton name="tag" tooltip="Add tag" tooltipDirection="n"
                octiconClass="p-1 mr-2"
                onClick={() => this.addTag()} />
              {tags}        
            </div>
          </div>

          <div className="entry-controls mr-2">
            <strong>
              {this.props.entry.CreatedAt.local()
                .format(this.props.context ? 'M-D-YY h:mm A' : 'h:mm A')
            }</strong>

            {ctxLink && 
              <a className="tooltipped tooltipped-w" aria-label="Go to context" href={ctxLink}>
                <button className="btn btn-octicon octicon octicon-link" 
                style={{ color: 'black' }} />
              </a>
                  }

            <OcticonButton name="trashcan" onClick={() => this.deleteEntry()}
              tooltip="Delete this entry" className="btn-danger ml-1" />
          </div>

        </div>
      </div>
      <div className="entry-body p-2 " id={`entry-body-${this.props.entry.ID}`} 
        ref={(body) => { if (body) this.body = body; }}
        dangerouslySetInnerHTML={{ __html: body }}
        onClick={e => this.editorOpen(e)} />
      
    </section>;
  }
}

// TODO: SFC
interface BrowseChronoProps {
  date: moment.Moment;
  entries: Entry[];
  daysView: boolean;
  searchString?: string;
}

class BrowseChrono extends React.PureComponent<BrowseChronoProps> {
  constructor(props: BrowseChronoProps) {
    super(props);
    this.navigatorRoute = this.navigatorRoute.bind(this);
  }

  navigatorRoute(method: 'add' | 'subtract' | 'reset', unit?: 'month' | 'year' | 'day') {
    if (method === 'reset') {
      return `view/${moment().format(common.MONTH_FORMAT)}`;
    } else if (unit) {
      const ndate = this.props.date.clone()[method](1, unit);
      const fmt = unit === 'day' ? common.DAY_FORMAT : common.MONTH_FORMAT;
      const route = this.props.daysView ? 'viewdays' : 'view';
      return `${route}/${ndate.format(fmt)}`;
    }
  }

  render() {
    // This could be simplified with some kind of reduce comparison
    const res = Array<React.ReactElement<{key: number}>>();

    let lastDate : moment.Moment | null = null;
    let key = 0;
    this.props.entries.forEach((e) => {
      if (!lastDate || (lastDate.format(common.DAY_FORMAT) !== e.Date.format(common.DAY_FORMAT))) {
        lastDate = e.Date;
        // Add a nicely formatted and linky date header for each day with entries
        if (key !== 0) {
          // Append HR after date headers
          key += 1;
          res.push(<hr key={key} />);
        }
        key += 1;
        res.push(<h3 className="pb-1" key={key}>
          {lastDate.format('dddd')}, {' '}
          <a href={`#view/${lastDate.format(common.MONTH_FORMAT)}/${e.ID}`}>
            {lastDate.format('MMMM')}
          </a>{' '}
          {lastDate.format('Do')}
          {' '}
          {this.props.daysView && lastDate.format('YYYY')}
        </h3>);
      }
      key += 1;
      res.push(<CEntry
        searchString={this.props.searchString} context={false} key={key} entry={e} />,
      );
    });

    return <div className="ml-md-2">
      <div className="d-flex flex-items-start flex-row mb-2">
        <TimeNavigator
          daysOnly={this.props.daysView}
          getRoute={this.navigatorRoute}
          currentDate={this.props.date} />
      </div>
      {res}
    </div>;
  }
}

// tslint:disable-next-line:variable-name
const ViewEntry = (props: {entry: Entry | null}) => {
  return props.entry ? <CEntry context={true} entry={props.entry} /> : <p>Entry deleted</p>;
};

class BrowseTag extends React.PureComponent<{tagName: string, entries: Entry[]}, {}> {
  render() {
    const entries: React.ReactElement<undefined>[] = [];
    let key = 0;
    this.props.entries.forEach((e) => {
      entries.push(<CEntry context={true} key={key} entry={e} />);
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
(class extends React.Component<JournalState, { searching: boolean }> {

  searchText: HTMLInputElement;

  constructor(props: any) {
    super(props);
    this.clearSearch = this.clearSearch.bind(this);
  }

  createEntry(date: moment.Moment | null) {
    if (date !== null) {
      common.post(`/journal/new?date=${date.format(common.DAY_FORMAT)}`, {});
    }
  }

  componentWillUpdate() {
  }

  componentWillReceiveProps() {
    this.setState({ searching: false });

  }

  clearSearch() {
    // TODO: Clear to previous URL.
    route(`view/${moment().format(common.MONTH_FORMAT)}`);
  }

  search(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (this.searchText.value.length > 0) {
      this.setState({ searching: true });
      route(`search/${this.searchText.value}`);
    }
  }

  render() {
    return <div className="d-flex flex-column flex-md-row mb-1 ml-2">
      <form className="form-inline d-flex flex-column flex-md-row" style={{ display: 'inline' }}
        onSubmit={e => this.search(e)}>
          <DatePicker className="form-control mb-1 mb-md-0"
            onChange={date => this.createEntry(date)} 
            placeholderText="Click to add new entry"
            />
          <input type="text" className="form-control mb-1 mb-md-0 ml-md-2"
            placeholder="Text to search for"
          ref={(searchText) => { if (searchText) this.searchText = searchText; }} />
          <button className="btn btn-primary ml-md-1">Search for text</button>
        </form>

        {this.state && this.state.searching &&
          <span className="ml-1 flex-self-center">Searching...</span>}

        <div className="ml-1 flex-self-center">
          {(this.props.searchResults === 0) &&
            <span className="flash flash-warn p-1">No search results :(</span> 
          }
          {(this.props.searchResults && this.props.searchResults > 0) ?
            <button className="tooltipped tooltipped-s tag" onClick={this.clearSearch}
              aria-label="Clear search results">
              Displaying <strong>{this.props.searchResults}</strong> results
              <span className="octicon octicon-x ml-1" />
            </button> : ''}
        </div>
      </div>;
  }
});

// tslint:disable-next-line:variable-name
export const JournalRoot = common.connect()(class extends React.Component<JournalState, {}> {
  render() { 
    return <CommonUI {...this.props}>
      <div className="d-flex flex-column flex-md-row flex-justify-between mr-1">
        <div id="journal-sidebar" className="mb-1">
          <JournalSidebar  />
        </div>

        <div id="journal-main" className="ml-1 ">
          <JournalNavigation />
          {((this.props.route === 'VIEW_MONTH' || this.props.route === 'VIEW_DAYS') ||
            this.props.searchResults) &&
            <BrowseChrono 
              searchString={this.props.searchString}
              daysView={this.props.route === 'VIEW_DAYS'}
              date={
                (this.props.route === 'VIEW_MONTH' || this.props.route === 'VIEW_DAYS') ?
                  this.props.date : moment()
              }
              entries={this.props.entries} />}
          {this.props.route === 'VIEW_TAG' &&
            <BrowseTag tagName={this.props.tag} entries={this.props.entries} /> }
          {this.props.route === 'VIEW_NAMED_ENTRY' &&
            <ViewEntry entry={this.props.entries.length === 0 ? null
              : this.props.entries[0]} /> }
          { this.props.route === 'VIEW_SEARCH' &&
            <span>Search not implemented yet</span>
            }
        </div>
      </div>
    </CommonUI>;
  }
});
