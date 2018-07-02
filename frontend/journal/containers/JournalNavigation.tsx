
import * as moment from 'moment';
import * as React from 'react';
import { JournalState } from '../state';
import DatePicker from 'react-datepicker';

import * as common from '../../common';
import { JOURNAL_ROLLOVER_TIME } from '../../common/constants';
import { OcticonSpan } from '../../common/components/OcticonButton';
import { OcticonX } from '../../common/octicons';
import { Spinner } from '../../common/components/Spinner';

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
    return (
      <div className="d-flex flex-column flex-md-row mb-1 ml-md-2 ">
        <button
          className="btn btn-primary mr-0 mr-md-1 mb-1 mr-mb-0"
          onClick={this.createEntry}
        >
          Add entry
        </button>

        <DatePicker
          customInput={<button>
            Add entry on specific date
          </button>}
          className="btn btn-secondary mb-1 mb-md-0"
          onChange={this.createEntry}
        />

        <form
          className="form-inline d-flex flex-column flex-md-row"
          onSubmit={this.search}
        >
          <input
            type="text"
            className="form-control mb-1 mb-md-0 ml-md-2"
            placeholder="Text to search for"
            ref={(searchText) => { if (searchText) this.searchText = searchText; }}
          />
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
            <button
              className="tooltipped tooltipped-s tag"
              onClick={this.clearSearch}
              aria-label="Clear search results"
            >
              Displaying <strong>{this.props.searchResults}</strong> results
              <OcticonSpan icon={OcticonX} className="ml-1" />
            </button> : ''}
        </div>
      </div>
    );
  }
}

export const JournalNavigation = common.connect()(JournalNavigation1);
