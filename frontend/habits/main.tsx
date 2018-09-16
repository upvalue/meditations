// main.tsx - Main habits file; routing & socket handling

import * as React from 'react';
import * as moment from 'moment';
import route from 'riot-route';
import { reverse, rangeRight } from 'lodash';

import * as common from '../common';

import {
  ScopeType,  Project, Task, store, dispatch, HabitsState, Day, dispatchProjectListUpdate,
} from './state';
import { HabitsRoot } from './containers/HabitsRoot';

/** Convenience method; returns route argument for a given date and project. */
export const routeForView = (date: moment.Moment | 'current', project?: number) => {
  // tslint:disable-next-line
  return `view/${date === 'current' ? date : date.format(common.MONTH_FORMAT)}/${project ? project : 0}`;
};

/** Returns URL to link to a given date and project */
export const urlForView = (date: moment.Moment | 'current', project?: number) => {
  return `#${routeForView(date, project)}`;
};

export const dispatchProjectUpdate = (id: number, days: number) => {
  dispatch((dispatch) => {
    common.get(`/habits/project/${id}/${days}`, ((response: Project) => {
      dispatch({
        type: 'UPDATE_PROJECT',
        project: response,
      });
    }));
  });
};

/** Habits entry point. Sets up router, socket, and renders root. */
export const main = () => {
  ///// INSTALL ROUTER
  common.installRouter('/habits#', `view/${moment().format(common.MONTH_FORMAT)}/0`, {
    no_action: () => {
      route(routeForView(moment(), 0));
    },
    habits: () => {},
    view: (datestr: string, scopestr: string) => {
      const state = store.getState() as HabitsState;
      const project = parseInt(scopestr, 10);

      // Special case URL: if date is "current", we'll use state.currentDate in the URL. This allows
      // some components to avoid being re-rendered when the date changes.

      if (datestr === 'current') {
        route(routeForView(state.currentDate, project), '?', true);
      }

      if (state === undefined) return;
      const date = datestr === 'current' ? state.currentDate : moment(datestr, common.MONTH_FORMAT);

      // There are three possible UI changes that can result from this route
      // 1) Month and days need to be remounted (date changed by a month)
      // 2) Months, days and year needs to be remounted (date changed by a year)
      // 3) Project needs to be remounted (currentProject changed)

      if (state === undefined) return;
      const prevDate = state.currentDate;
      const prevProject = state.currentProject;

      let timeChanged: 'NO_CHANGE' | 'CHANGE_YEAR' | 'CHANGE_MONTH' = 'NO_CHANGE';

      if (state.mounted === false) {
        // First mount, fetch everything
        timeChanged = 'CHANGE_YEAR';
      } else if (date.format(common.DAY_FORMAT) !== prevDate.format(common.DAY_FORMAT)) {
        // After first mount, fetch only what has changed
        timeChanged = 'CHANGE_MONTH';
        if (date.year() !== prevDate.year()) {
          timeChanged = 'CHANGE_YEAR';
        }
      }

      const projectChanged = prevProject !== project;

      common.setTitle('Habits', `${date.format('MMMM YYYY')}`);
      dispatch({ date, type: 'CHANGE_ROUTE', currentProject: project });

      // Get day scopes
      if (timeChanged === 'CHANGE_YEAR' || timeChanged === 'CHANGE_MONTH') {
        dispatch((dispatch) => {
          const qs = `/habits/in-month-and-days?date=${date.format(common.DAY_FORMAT)}`;
          common.get(qs,
            ((response: { Days: Task[], Month: Task[] }) => {

              // Create TimeScope display array
              const array = rangeRight(date.daysInMonth()).map((_, i) => ({
                Date: moment(date).clone().date(i + 1).format(common.DAY_FORMAT),
                Tasks: [] as Task[],
              }));

              response.Days.forEach((t) => {
                common.processModel(t);
                array[t.Date.date() - 1].Tasks.push(t);
              });

              response.Month.forEach(common.processModel);

              dispatch({
                date,
                type: 'MOUNT_DAYS_AND_SCOPE',
                days: reverse(array),
                scope: ScopeType.MONTH,
                tasks: response.Month,
              });
            }),
           );
        });
      }

      if (timeChanged === 'CHANGE_YEAR') {
        dispatch((dispatch) => {
          common.get(`/habits/in-year?date=${date.format(common.DAY_FORMAT)}`,
          ((tasks: Task[]) => {
            tasks.forEach(common.processModel);
            dispatch({ date, tasks, type: 'MOUNT_SCOPE', scope: ScopeType.YEAR });
          }));
        });
      }

      // Retrieve and mount project list
      if (!state.pinnedProjects) {
        dispatchProjectListUpdate(state.projectStatsDays);
      }

      // Retrieve and mount requested project
      if (projectChanged) {
        dispatch((dispatch) => {
          common.get(`/habits/in-project/${project}`,
            ((response: { scope: { Name: string, ID: number }, tasks: Task[] }) => {
              response.tasks.forEach(common.processModel);
              dispatch({
                date, type: 'MOUNT_SCOPE', name: response.scope.Name,
                scope: response.scope.ID, tasks: response.tasks,
              });
            }));
        });
      }
    },
  });

  ///// INSTALL WEBSOCKET
  type HabitMessage = {
    Type: 'UPDATE_TASKS_AND_PROJECT';
    Datum: {
      Tasks: Task[],
      ProjectID?: number,
    }
  } | {
    Type: 'UPDATE_SCOPE';
    Datum: {
      Date: string;
      Scope: number;
      Tasks: Task[],
      Name: string;
    }
  } | {
    Type: 'GET_PROJECT_LIST';
    Datum: {
      Pinned: Project[];
      Unpinned: Project[];
    }
  } | {
    Type: 'GET_PROJECT';
    Datum: Project;
  };

  common.makeSocket('habits/sync', (msg: HabitMessage) => {
    console.log(`Received WebSocket message`, msg);
    switch (msg.Type) {
      case 'UPDATE_TASKS_AND_PROJECT':
        msg.Datum.Tasks.forEach(common.processModel);

        dispatch({type: 'UPDATE_TASKS',
          tasks: msg.Datum.Tasks,
        });

        if (msg.Datum.ProjectID) {
          dispatchProjectUpdate(msg.Datum.ProjectID, store.getState().projectStatsDays);
        }
        break;

      case 'UPDATE_SCOPE':
        msg.Datum.Tasks.forEach(common.processModel);
        dispatch({type: 'MOUNT_SCOPE', date: moment(msg.Datum.Date, common.DAY_FORMAT),
          scope: msg.Datum.Scope, tasks: msg.Datum.Tasks, name: msg.Datum.Name});
        break;

      case 'GET_PROJECT':
        dispatchProjectUpdate(msg.Datum.ID, store.getState().projectStatsDays);
        break;

      case 'GET_PROJECT_LIST':
        dispatchProjectListUpdate(store.getState().projectStatsDays);
        break;
    }
  });

  ///// RENDER
  common.render('root', store, React.createElement(HabitsRoot));
};
