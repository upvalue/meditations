import moment from 'moment';
import * as React from 'react';
import route from 'riot-route';

import { OcticonButton } from './OcticonButton';
import {
  OcticonTriangleLeft, OcticonChevronLeft, OcticonCalendar, OcticonChevronRight,
  OcticonTriangleRight,
} from '../octicons';

interface TimeNavigatorProps {
  /** Returns a page-appropriate route string for navigation */
  getRoute: (operation: 'subtract' | 'add' | 'reset', unit?: 'month' | 'year' | 'day') =>
    string | undefined;

  /** Date to work off of */
  currentDate: moment.Moment;

  /**
   * If true, only one set of arrows is available and it navigates days rather than
   * months and years.
   */
  daysOnly: boolean;
}

/** Navigate by months or years */
export class TimeNavigator extends React.PureComponent<TimeNavigatorProps> {
  navigate(e: React.MouseEvent<HTMLElement> | undefined,
      operation: 'subtract' | 'add' | 'reset', unit?: 'year' | 'month' | 'day') {

    if (e) {
      e.preventDefault();
    }

    const routestr = this.props.getRoute(operation, unit);
    if (routestr) {
      route(routestr);
    }
  }

  render() {
    const smallunit = this.props.daysOnly ? 'day' : 'month';
    return (
      <div className="d-flex flex-justify-between flex-md-row flex-column mb-1">
        <div className="d-flex flex-row">
          {!this.props.daysOnly &&
            <OcticonButton
              icon={OcticonTriangleLeft}
              tooltip="Go back one year"
              className="mr-1 d-flex flex-items-center navigator-btn"
              normalButton={true}
              href={`#${this.props.getRoute('subtract', 'year')}`}
              onClick={e => this.navigate(e, 'subtract', 'year')}
              tooltipDirection="e"
            />}

          <OcticonButton
            icon={OcticonChevronLeft}
            tooltip={`Go back one ${smallunit}`}
            tooltipDirection="e"
            className="mr-1 d-flex flex-items-center navigator-btn"
            normalButton={true}
            href={`#${this.props.getRoute('subtract', smallunit)}`}
            onClick={e => this.navigate(e, 'subtract', smallunit)}
          />

          <OcticonButton
            icon={OcticonCalendar}
            tooltip="Go to current date"
            tooltipDirection="e"
            className="mr-1 d-flex flex-items-center navigator-btn"
            normalButton={true}
            href={`#${this.props.getRoute('reset')}`}
            onClick={e => this.navigate(e, 'reset')}
          />

          <OcticonButton
            icon={OcticonChevronRight}
            tooltip={`Go forward one ${smallunit}`}
            tooltipDirection="e"
            className="mr-1 d-flex flex-items-center navigator-btn"
            normalButton={true}
            href={`#${this.props.getRoute('add', smallunit)}`}
            onClick={e => this.navigate(e, 'add', smallunit)}
          />

          {!this.props.daysOnly &&
            <OcticonButton
              icon={OcticonTriangleRight}
              tooltip="Go forward one year"
              className="mr-1 mr-0 d-flex flex-items-center navigator-btn"
              normalButton={true}
              tooltipDirection="e"
              href={`#${this.props.getRoute('add', 'year')}`}
              onClick={e => this.navigate(e, 'add', 'year')}
            />}
        </div>

        <h2 className="navigation-title ml-1">{this.props.currentDate.format('MMMM YYYY')}</h2>
      </div>
    );
  }
}
