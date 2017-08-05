// components.tsx - Common components

import * as React from 'react';
import * as moment from 'moment';

import { OcticonButton } from '../common';

interface TimeNavigatorProps {
  navigate: (operation:'subtract' | 'add', unit:'year' | 'month') => void;
  currentDate: moment.Moment;
}

export class TimeNavigator extends React.PureComponent<TimeNavigatorProps, {}> {
  render() {
    return <div className="d-flex flex-justify-between mb-1">
      <OcticonButton name="triangle-left" tooltip="Go back one year" octiconClass="mr-1"
        onClick={() => this.props.navigate('subtract', 'year')} tooltipDirection="e" />

      <OcticonButton name="chevron-left" tooltip="Go back one month"
        octiconClass="mr-1" tooltipDirection="e"
        onClick={() => this.props.navigate('subtract', 'month')} />

      <OcticonButton name="chevron-right" tooltip="Go forward one month"
        tooltipDirection="e"
        octiconClass="mr-1"
        onClick={() => this.props.navigate('add', 'month')} />

      <OcticonButton name="triangle-right" tooltip="Go forward one year"
        tooltipDirection="e"
        octiconClass="mr-1"
        onClick={() => this.props.navigate('add', 'year')} />
      <h2 className="navigation-title ml-1">{this.props.currentDate.format('MMMM YYYY')}</h2>
    </div>;
  }
}
