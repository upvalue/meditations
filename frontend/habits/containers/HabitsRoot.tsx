import * as React from 'react';
import * as ReactDnd from 'react-dnd';
import HTML5Backend from 'react-dnd-html5-backend';
import * as moment from 'moment';

import * as common from '../../common';
import { MOUNT_NEXT_DAY_TIME } from '../../common/constants';
import { HabitsState, Scope } from '../state';
import { Spinner, CommonUI } from '../../common/components';
import {
  ProjectList, ProjectScope,
} from '../components';

import { HabitsControlBar } from '../components/HabitsControlBar';
import { TimeScope } from '../components/TimeScope';
import { HabitsMobileMenu } from '../components/HabitsMobileMenu';

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
      return <TimeScope currentProject={this.props.currentProject}
        key={i} currentDate={this.props.currentDate} scope={s}
        filter={this.props.filter} lastModifiedTask={this.props.lastModifiedTask}
        mostRecentDay={(i && i === 1) ? true : false}
        />;
    }
    return <Spinner />;
  }

  /** Render either a list of projects or the currently open project */
  renderProjects() {
    if (this.props.currentProject === 0) {
      return <ProjectList
        hiddenProjects={this.props.hiddenProjects}
        pinnedProjects={this.props.pinnedProjects}
        unpinnedProjects ={this.props.unpinnedProjects}
        projectStatsDays={this.props.projectStatsDays} />;
    }

    if (this.props.project && this.props.currentProject === this.props.project.Scope) {
      return <ProjectScope  currentDate={this.props.currentDate} scope={this.props.project}
        projectStatsDays={this.props.projectStatsDays} />;
    }

    // In case the route has changed, but the project data has not been loaded yet.
    return <Spinner />;
  }

  render() {
    return <div id="habits-root-sub">
      <CommonUI {...this.props}>
        <HabitsControlBar {...this.props} />
        <HabitsMobileMenu />
        <div className="d-flex flex-column flex-md-row">
          <div id="scope-days" className="scope-column mr-md-1">
            {this.props.days ?
              this.props.days
                // Only render a single day in advance of the current time
                .filter((d, i) =>
                  (d.Date < moment().add(MOUNT_NEXT_DAY_TIME, 'hours')) || i === 1)
                .map((d, i) => this.renderTimeScope(d, i)) :
              <Spinner /> }
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
    </div>;
  }
}));
