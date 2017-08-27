// main.tsx - Main habits file; routing & socket handling

import * as React from 'react';
import * as moment from 'moment';
import route from 'riot-route';

import * as common from '../common';

import { ScopeType, FilterState, Status, Scope, Project, Task, store, dispatch, HabitsState, Day,
  MountScope, PROJECT_STATS_DAYS_DEFAULT, dispatchProjectListUpdate } from './state';
import { HabitsRoot } from './components';

/**
 * Determines at what point in time the next day's scope will be made available. The default of 4
 * hours means it will be available at 8PM local time. */
export const MOUNT_NEXT_DAY_TIME = 4;

/** Convenience method; returns route argument for a given date and project. */
export const routeForView = (date: moment.Moment, project?: number) => {
  return `view/${date.format(common.MONTH_FORMAT)}/${project ? project : 0}`;
};

/** Returns URL to link to a given date and project */
export const urlForView = (date: moment.Moment, project?: number) => {
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
      const date = moment(datestr, common.MONTH_FORMAT);
      const project = parseInt(scopestr, 10);

      // There are three possible UI changes that can result from this route
      // 1) Month and days need to be remounted (date changed by a month)
      // 2) Months, days and year needs to be remounted (date changed by a year)
      // 3) Project needs to be remounted (currentProject changed)

      const state = store.getState() as HabitsState;
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
          let limit = null;
          const today = moment();

          // If we are showing days for the current month,
          // we won't render days that haven't happened yet in advance
          if (today.month() === date.month() && today.year() === date.year()) {
            limit = today.date() + 1;

            // But do mount the next day if it's within 4 hours before midnight so tasks can be
            // added at nighttime. Unless the next day is in the next month.
            const next = today.clone().add(MOUNT_NEXT_DAY_TIME, 'hours');
            if (next.date() !== today.date() && next.month() === today.month()) {
              limit += 1;
            }
          }

          // Build query string to pull all tasks in the month and day
          let qs = `/habits/in-month-and-days?date=${date.format(common.DAY_FORMAT)}`;
          qs += `${limit ? '&limit=' + limit : ''}`;

          common.get(qs,
            ((response: { Days: Day[], Month: Task[] }) => {
              response.Days.forEach((d) => {
                d.Tasks.forEach(common.processModel);
              });

              response.Month.forEach(common.processModel);

              dispatch({ date, type: 'MOUNT_DAYS', days: response.Days });
              dispatch({ date, type: 'MOUNT_SCOPE', scope: ScopeType.MONTH,
                tasks: response.Month });
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
        dispatchProjectListUpdate(state.projectStatsDays)
        /*
        dispatch((dispatch) => {
          common.get(`/habits/projects/${state.projectActivityDays}`, ((response:
            { Pinned: Project[], Unpinned: Project[] }) => {
            dispatch({ type: 'PROJECT_LIST', pinnedProjects: response.Pinned,
              unpinnedProjects: response.Unpinned });
          }));
        });
        */
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
  common.render('root', store, <HabitsRoot />);
};
