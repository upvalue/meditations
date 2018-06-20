import * as React from 'react';
import * as moment from 'moment';
import route from 'riot-route';
import DatePicker from 'react-datepicker';

import * as common from '../common';
import { TimeNavigator, Editable, CommonUI, OcticonButton, OcticonSpan, Spinner }
  from '../common/components';

import { JournalState, Entry, Tag } from './state';
import { JournalSidebar } from './sidebar';
import { JOURNAL_ROLLOVER_TIME } from '../common/constants';

import { CEntry } from './entry';
import { OcticonX } from '../common/octicons';

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
  }

  navigatorRoute = (method: 'add' | 'subtract' | 'reset', unit?: 'month' | 'year' | 'day') => {
    if (method === 'reset') {
      return `view/${moment().format(common.MONTH_FORMAT)}`;
    }
    if (unit) {
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

class JournalNavigation1 extends React.Component<JournalState, { searching: boolean }> {
  searchText!: HTMLInputElement;

  constructor(props: any) {
    super(props);

    this.state = {
      searching: false,
    };
  }

  createEntry = (arg: moment.Moment | null | React.MouseEvent<HTMLButtonElement>) => {
    if (arg !== null) {
      if (moment.isMoment(arg)) {
        common.post(`/journal/new?date=${arg.format(common.DAY_FORMAT)}`, {});
      } else {
        let date = moment();
        date = (date.hour() <= JOURNAL_ROLLOVER_TIME) ? date.subtract(1, 'day') : date;
        common.post(`/journal/new?date=${date.format(common.DAY_FORMAT)}`, {});
      }
    }
  }

  componentWillReceiveProps() {
    this.setState({ searching: false });
  }

  clearSearch = () => {
    // TODO: Clear to previous URL.
    route(`view/${moment().format(common.MONTH_FORMAT)}`);
  }

  search = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (this.searchText.value.length > 0) {
      this.setState({ searching: true });
      route(`search/${this.searchText.value}`);
    }
  }

  render() {
    return <div className="d-flex flex-column flex-md-row mb-1 ml-md-2 ">
      <button
        className="btn btn-primary mr-0 mr-md-1 mb-1 mr-mb-0"
        onClick={this.createEntry}>
        Add entry
      </button>

      <DatePicker
        customInput={<button>
          Add entry on specific date
        </button>}
        className="btn btn-secondary mb-1 mb-md-0"
        onChange={this.createEntry}
        />

      <form className="form-inline d-flex flex-column flex-md-row"
        onSubmit={this.search}>
          <input type="text" className="form-control mb-1 mb-md-0 ml-md-2"
            placeholder="Text to search for"
          ref={(searchText) => { if (searchText) this.searchText = searchText; }} />
          <button
            className="btn btn-primary ml-md-1"
            disabled={this.state.searching}
            >
            {this.state.searching ?
              <Spinner /> : 'Search for text' }
          </button>
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
              <OcticonSpan icon={OcticonX} className="ml-1" />
            </button> : ''}
        </div>
      </div>;
  }
}

const JournalNavigation = common.connect()(JournalNavigation1);

// tslint:disable-next-line:variable-name
export const JournalRoot = common.connect()(class extends React.Component<JournalState, {}> {
  render() {
    return <CommonUI {...this.props}>
      <div className="d-flex flex-column flex-md-row flex-justify-between mr-md-1">
        <div id="journal-sidebar" className="mb-1">
          {React.createElement(JournalSidebar)}
        </div>

        <div id="journal-main" className="ml-md-1">
          {React.createElement(JournalNavigation)}
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
