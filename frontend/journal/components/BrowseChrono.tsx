import * as React from 'react';
import * as moment from 'moment';

import * as common from '../../common';
import { Entry } from '../state';
import { CEntry } from '../components/CEntry';
import { TimeNavigator } from '../../common/components';

// TODO: SFC
interface BrowseChronoProps {
  date: moment.Moment;
  entries: Entry[];
  daysView: boolean;
  searchString?: string;
}

/**
 * Browse journal chronologically
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
        res.push((
          <h3 className="pb-1" key={key}>
            {lastDate.format('dddd')}, {' '}
            <a href={`#view/${lastDate.format(common.MONTH_FORMAT)}/${e.ID}`}>
              {lastDate.format('MMMM')}
            </a>{' '}
            {lastDate.format('Do')}
            {' '}
            {this.props.daysView && lastDate.format('YYYY')}
          </h3>
        ));
      }
      key += 1;
      res.push((
        <CEntry
          searchString={this.props.searchString}
          context={false}
          key={key}
          entry={e}
        />
      ));
    });

    return (
      <div className="ml-md-2">
        <div className="d-flex flex-items-start flex-row mb-2">
          <TimeNavigator
            daysOnly={this.props.daysView}
            getRoute={this.navigatorRoute}
            currentDate={this.props.date}
          />
        </div>
        {res}
      </div>
    );
  }
}
