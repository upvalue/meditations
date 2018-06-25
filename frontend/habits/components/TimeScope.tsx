import * as React from 'react';
import * as moment from 'moment';

import { Scope, FilterState, ScopeType } from '../state';
import { routeForView } from '../main';
import { createCTask } from './Task';
import { PresentScope } from '../components/PresentScope';

interface TimeScopeProps {
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

export class TimeScope extends React.Component<TimeScopeProps> {
  constructor(props: TimeScopeProps) {
    super(props);
  }

  navigate(method: 'add' | 'subtract') {
    const unit = this.props.scope.Scope === ScopeType.MONTH ? 'month' : 'year';
    const ndate = this.props.currentDate.clone()[method](1, unit);
    route(routeForView(ndate, this.props.currentProject));
  }

  render() {
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

    const tasks = filteredTasks.map((t, i) => {
      return createCTask(t, this.props.lastModifiedTask);
    });

    const title =
      this.props.scope.Date.format(['', 'dddd Do', 'MMMM', 'YYYY'][this.props.scope.Scope]);

    return <PresentScope
        scope={this.props.scope}
        title={title}
        mostRecentDay={this.props.mostRecentDay}>
      {...tasks}
    </PresentScope>;
  }
}
