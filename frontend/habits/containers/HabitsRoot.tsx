import * as React from 'react';
import * as ReactDnd from 'react-dnd';
import HTML5Backend from 'react-dnd-html5-backend';
import * as moment from 'moment';

import * as common from '../../common';
import { MOUNT_NEXT_DAY_TIME } from '../../common/constants';
import { HabitsState, Scope } from '../state';
import { CommonUI } from '../../common/components/CommonUI';
import { Spinner } from '../../common/components/Spinner';

import { HabitsControlBar } from '../components/HabitsControlBar';
import { TimeScope } from '../components/TimeScope';
import { HabitsMobileMenu } from '../components/HabitsMobileMenu';
import { ProjectScope } from '../components/ProjectScope';
import { ProjectList } from '../components/ProjectList';

export const HabitsRoot = ReactDnd.DragDropContext(HTML5Backend)(
    common.connect()(class extends React.PureComponent<HabitsState> {
  /**
   * Render a time-based scope (daily, monthly, yearly)
   * @param s The scope; if undefined, returns a spinner
   * @param i The day, if daily scope
   */
  renderTimeScope(s?: Scope, i?: number) {
    if (s) {
      // TODO: Filter by date?
      return (
        <TimeScope
          currentProject={this.props.currentProject}
          key={i}
          currentDate={this.props.currentDate}
          scope={s}
          filter={this.props.filter}
          lastModifiedTask={this.props.lastModifiedTask}
          mostRecentDay={(i && i === 1) ? true : false}
        />
      );
    }
    return <Spinner />;
  }

  /** Render either a list of projects or the currently open project */
  renderProjects() {
    if (this.props.currentProject === 0) {
      return (
        <ProjectList
          hiddenProjects={this.props.hiddenProjects}
          pinnedProjects={this.props.pinnedProjects}
          unpinnedProjects={this.props.unpinnedProjects}
          projectStatsDays={this.props.projectStatsDays}
        />
      );
    }

    if (this.props.project && this.props.currentProject === this.props.project.Scope) {
      return (
        <ProjectScope
          currentDate={this.props.currentDate}
          scope={this.props.project}
          projectStatsDays={this.props.projectStatsDays}
        />
      );
    }

    // In case the route has changed, but the project data has not been loaded yet.
    return <Spinner />;
  }

  renderDays() {
    let { days } = this.props;

    const today = moment();

    if (this.props.currentDate.month() === today.month()
        && this.props.currentDate.year() === today.year()) {

      // Current month
      // 1) Always display first day of month, in case no tasks have been added to it
      // 2) Display all days up to curent day
      // 3) Display next day if within a certain amount of hours (specified in constants file)

      days = days.filter((d, i) => (
        i === days.length ||
        // Present date
        d.Date.date() <= today.date() ||
        (d.Date.date() === today.date() + 1 && today.hour() > (24 - MOUNT_NEXT_DAY_TIME))
      ));
    }

    return days.map((d, i) => this.renderTimeScope(d, i));
  }

  render() {
    return (
      <div id="habits-root-sub">
        <CommonUI {...this.props}>
          <HabitsControlBar {...this.props} />
          <HabitsMobileMenu />
          <div className="d-flex flex-column flex-md-row">
            <div id="scope-days" className="scope-column mr-md-1">
              {this.props.days ? this.renderDays() : <Spinner />}
            </div>
            <div id="scope-month" className="scope-column mr-md-1">
              {this.renderTimeScope(this.props.month)}
            </div>
            <div id="scope-year" className="scope-column mr-md-1">
              {this.renderTimeScope(this.props.year)}
            </div>
            <div id="scope-projects" className="scope-column">
              {this.props.pinnedProjects ? this.renderProjects() : <Spinner />}
            </div>
          </div>
        </CommonUI>
      </div>
    );
  }
}));
