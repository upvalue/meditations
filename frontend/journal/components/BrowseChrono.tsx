import * as React from 'react';
import * as moment from 'moment';
import { groupBy } from 'lodash';

import * as common from '../../common';
import { Entry } from '../state';
import { CEntry } from './CEntry';
import { TimeNavigator } from '../../common/components/TimeNavigator';

interface ChronoSectionProps {
  date: moment.Moment;
  entries: Entry[];
  daysView: boolean;
  searchString?: string;
}

/**
 * Chronological entry section (header for each day, with entries)
 */
class ChronoSection extends React.Component<ChronoSectionProps> {
  render() {
    const firstEntryID = this.props.entries.length > 0 ? this.props.entries[0].ID : 0;
    return (
      <>
        <h3 className="pb-1">
          {this.props.date.format('dddd')},{' '}
          {/* Generate permalink for user convenience */}
          <a href={`#view/${this.props.date.format(common.MONTH_FORMAT)}/${firstEntryID}`}>
            {this.props.date.format('MMMM')}
          </a>
          {' '}
          {this.props.date.format('Do')}
          {' '}
          {this.props.daysView && this.props.date.format('YYYY')}
        </h3>

        {this.props.entries.map(e =>
          <CEntry
            key={e.ID}
            entry={e}
            context={false}
            searchString={this.props.searchString}
          />,
        )}

        <hr />
      </>
    );
    return <h1>{this.props.date.format(common.DAY_FORMAT)}</h1>;
  }

}

interface BrowseChronoProps {
  date: moment.Moment;
  entries: Entry[];
  daysView: boolean;
  searchString?: string;
}

/**
 * List journal entries chronologically
 */
export class BrowseChrono extends React.PureComponent<BrowseChronoProps> {
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
    const dateEntries = groupBy(this.props.entries, e =>
      e.Date.format(common.DAY_FORMAT),
    );

    return (
      <div className="ml-md-2">
        <div className="d-flex flex-items-start flex-row mb-2">
          <TimeNavigator
            daysOnly={this.props.daysView}
            getRoute={this.navigatorRoute}
            currentDate={this.props.date}
          />
        </div>

        {Object.keys(dateEntries).map(k =>
          <ChronoSection
            key={k}
            daysView={this.props.daysView}
            searchString={this.props.searchString}
            date={moment(k)}
            entries={dateEntries[k]}
          />,
        )}
      </div>
    );
  }
}
