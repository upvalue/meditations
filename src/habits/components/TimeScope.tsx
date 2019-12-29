import * as React from 'react';
import moment from 'moment';

import { Scope, FilterState, ScopeType } from '../state';
import { createCTask } from './Task';
import { PresentScope } from './PresentScope';
import { DayScopeEmpty } from './DayScopeEmpty';

export interface TimeScopeProps {
  currentProject: number;
  currentDate: moment.Moment;
  scope: Scope;
  filter: FilterState;

  /**
   * The task name the user most recently interacted with. Used to bolden the task name across
   * the whole interface.
   */
  lastModifiedTask: string;

  /**
   * True if this is the most recent daily scope. Used for keybindings.
   */
  mostRecentDay: boolean;
}

/**
 * Displays tasks within a particular time scope (day, month or year)
 */
export class TimeScope extends React.Component<TimeScopeProps> {
  render() {
    const title =
      this.props.scope.Date.format(['dddd Do', 'MMMM', 'YYYY'][this.props.scope.Scope - 1]);

    if (this.props.scope.Scope === ScopeType.DAY &&
      this.props.scope.Tasks.length === 0) {

      return <DayScopeEmpty day={this.props.scope} title={title} />;
    }

    let filteredTasks = this.props.scope.Tasks;

    // Apply filters
    if (this.props.filter.name) {
      const filterName = this.props.filter.name;
      filteredTasks = filteredTasks.filter((t, i) => {
        return t.Name.toLowerCase().startsWith(filterName.toLowerCase());
      });
    }

    const filterBegin = this.props.filter.begin;
    const filterEnd = this.props.filter.end;

    if (filterBegin || filterEnd) {
      if (filterBegin && filterEnd) {
        filteredTasks = filteredTasks.filter((t, i) =>
          t.Date >= filterBegin && t.Date <= filterEnd);
      } else if (filterBegin) {
        filteredTasks = filteredTasks.filter((t, i) => t.Date >= filterBegin);
      } else if (filterEnd) {
        filteredTasks = filteredTasks.filter((t, i) => t.Date <= filterEnd);
      }
    }


    return (
      <PresentScope
        scope={this.props.scope}
        title={title}
        mostRecentDay={this.props.mostRecentDay}
      >
        {filteredTasks.map(t => createCTask(t, this.props.lastModifiedTask))}
      </PresentScope>
    );
  }
}
