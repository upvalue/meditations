// state.ts - Habits state and backend interaction
import * as moment from 'moment';

import * as common from '../common';

export enum Status {
  UNSET = -1,
  COMPLETE = 0,
  INCOMPLETE = 2,
  WRAP = 3,
}

export enum ScopeType {
  UNUSED = 0,
  DAY = 1,
  MONTH = 2,
  YEAR = 3,
  PROJECT = 4,
}

export const scopeIsTimeBased = (scope: number) => {
  return scope < ScopeType.PROJECT && scope > ScopeType.UNUSED;
};

export interface Comment extends common.Model {
  Body: string;
}

export interface Task extends common.Model {
  ID: number;
  Minutes: number;
  Order: number;
  Status: number;
  Scope: number;
  Name: string;
  Comment?: Comment;
  // Derived statistics
  Streak: number;
  BestStreak: number;
  CompletedTasks: number;
  CompletionRate: number;
  TotalTasks: number;
  TotalTasksWithTime: number;
}

/** Default amount of days to track project activity for */
export const PROJECT_STATS_DAYS_DEFAULT = 72;

/**
 * Note that this does not track the structure of the backend
 * Scope table but is used for rendering
 */
export interface Scope {
  Name: string;
  Scope: ScopeType;
  Date: moment.Moment;
  Tasks: Task[];
}

export enum ProjectVisibility {
  Hidden,
  Unpinned,
  Pinned,
}

export type Project = {
  ID: number;
  Name: string;
  Visibility: ProjectVisibility;
  CompletedTasks: number;
  Minutes: number;
};

/** A list of tasks and a date; used to mount a bunch of days at once. */
export interface Day {
  Date: string;
  Tasks: Task[];
}

///// REDUX

export interface FilterState {
  name?: string;
  begin?: moment.Moment | null;
  /** Filter ending date */
  end?: moment.Moment | null;
}

export interface ProjectStatsState {
  begin?: moment.Moment | null;
  end?: moment.Moment | null;
}

export interface HabitsState extends common.CommonState {
  type: 'VIEW_MONTH';
  // Navigation & routing
  currentDate: moment.Moment;
  // Current project; if 0, a list of projects will be displayed instead
  currentProject: number;

  // True after some UI information has been loaded
  mounted: boolean;

  // UI tree
  pinnedProjects: Project[];
  unpinnedProjects: Project[];
  hiddenProjects: Project[];

  month: Scope;
  year: Scope;
  days: Scope[];
  project: Scope;

  /**
   * Name of the last modified task. Used to highlight monthly/yearly tasks after daily tasks are
   * modified to reinforce rules
   */
  lastModifiedTask: string;

  /** Filter date-scoped tasks */
  filter: FilterState;

  /** Days to track project activity for */
  projectStatsDays: number;
}

interface ChangeRoute {
  type: 'CHANGE_ROUTE';
  date: moment.Moment;
  currentProject: number;
}

interface AddProjectList {
  type: 'PROJECT_LIST';
  pinnedProjects: Project[];
  unpinnedProjects: Project[];
  hiddenProjects: Project[];
  days: number;
}

interface MountDays {
  type: 'MOUNT_DAYS';
  date: moment.Moment;
  days: Day[];
}

export interface MountScope {
  type: 'MOUNT_SCOPE';
  scope: number;
  name?: string;
  tasks: Task[];
  date: moment.Moment;
}

interface UpdateTasks {
  type: 'UPDATE_TASKS';
  tasks: Task[];
}

/** Update a single project with new information */
interface UpdateProject {
  type: 'UPDATE_PROJECT';
  project: Project;
}

/** Update state to filter tasks by name */
interface FilterByName {
  type: 'FILTER_BY_NAME';
  name?: string;
}

/** Update state to add a beginning or end date to the filter */
interface FilterByDate {
  type: 'FILTER_BY_DATE';
  date: moment.Moment | null;
  end: boolean;
}

interface FilterClear {
  type: 'FILTER_CLEAR';
}

type HabitsAction = common.CommonAction | MountScope | UpdateTasks | MountDays |
  ChangeRoute | AddProjectList | FilterByName | FilterByDate | FilterClear | UpdateTasks |
  UpdateProject;

const initialState = {
  currentDate: moment(),
  mounted: false,
  type: 'VIEW_MONTH',
  filter: {},
  projectStatsDays: PROJECT_STATS_DAYS_DEFAULT,
} as HabitsState;

/** Check whether a particular scope+date combo is
 * currently rendered and thus needs to be updated */
const dateVisible = (state: HabitsState, scope: number, date: moment.Moment): boolean =>  {
  const date1 = moment.utc(date);
  const date2 = state.currentDate;

  // Check if a scope is visible by looking within the current month.
  // For daily and monthly tasks/scopes.
  if (scope === ScopeType.MONTH || scope === ScopeType.DAY) {
    return date1.year() === date2.year() && date1.month() === date2.month();
  }

  if (scope === ScopeType.YEAR) {
    return date1.year() === date2.year();
  }

  // TODO: Check project visibility
  return false;
};

/** Check whether a task is currently rendered and thus needs to be updated in the UI */
const taskVisible = (state: HabitsState, task: Task): boolean =>  {
  if (scopeIsTimeBased(task.Scope)) {
    return dateVisible(state, task.Scope, task.Date);
  }
  return task.Scope === state.project.Scope;
};

const mountScopeReducer = (state: HabitsState, action: MountScope): HabitsState => {
  if (action.name) {
    if (state.currentProject !== action.scope) {
      // console.log('Project scope not visible, ignoring');
      return state;
    }
    return {...state, mounted: true, project:
      { Name: action.name, Scope: action.scope, Tasks: action.tasks, Date: moment() } };
  }

  // If not provided, this is a time scope and may or may not need to be mounted
  const visible = dateVisible(state, action.scope, action.date);
  if (!visible) {
    console.log('Scope not visible, ignoring');
    return state;
  }
  const scope = { Scope: action.scope, Date: action.date, Tasks: action.tasks } as Scope;

  switch (action.scope) {
    case ScopeType.DAY:
      return {...state,
        days: state.days.map((s, i) => {
          // TODO is diff okay here?
          return s.Date.diff(action.date, 'days') === 0 ? scope : s;
        })};
    case ScopeType.MONTH: return { ...state, mounted: true, month: scope };
    case ScopeType.YEAR: return { ...state, mounted: true, year: scope };
  }
  return state;
};

const reducer = (state: HabitsState, action: HabitsAction): HabitsState => {
  switch (action.type) {
    case 'PROJECT_LIST':
      return { ...state,
        pinnedProjects: action.pinnedProjects,
        unpinnedProjects: action.unpinnedProjects,
        hiddenProjects: action.hiddenProjects,
        projectStatsDays: action.days };

    case 'CHANGE_ROUTE':
      return { ...state, currentDate: action.date, currentProject: action.currentProject };

    case 'MOUNT_SCOPE':
      return mountScopeReducer(state, action);

    case 'MOUNT_DAYS':
      const days : Scope[] = action.days.map(day => ({
        Name: '',
        Date: moment(day.Date, common.DAY_FORMAT),
        Scope: ScopeType.DAY,
        Tasks: day.Tasks,
      }));
      return { ...state, days, mounted: true };

    case 'UPDATE_TASKS': {
      const nstate = { ...state };
      for (const task of action.tasks) {
        nstate.lastModifiedTask = task.Name;
        // If task is not visible, no need to do anything
        if (taskVisible(state, task)) {
          const updateScope = (scope: Scope): Scope => {
            // New tasks can also come from UPDATE_TASKS
            // New tasks go on the end, so if it's not in the current list
            // it can be appended afterwards
            let append = true;
            const tasks = scope.Tasks.map((t) => {
              if (t.ID === task.ID) {
                append = false;
                return task;
              }
              return t;
            });
            if (append) {
              tasks.push(task);
            }
            return { ...scope, Tasks: tasks };
          };

          if (task.Scope === ScopeType.MONTH) {
            nstate.month = updateScope(nstate.month);
          } else if (task.Scope === ScopeType.YEAR) {
            nstate.year = updateScope(nstate.year);
          } else if (task.Scope === ScopeType.DAY) {
            // Update only the specific day using diff
            nstate.days =
              [...state.days.map(s =>
                s.Date.format(common.DAY_FORMAT) === task.Date.format(common.DAY_FORMAT) ?
                  updateScope(s) : s)];
          } else {
            nstate.project = updateScope(nstate.project);
          }
        } else {
          console.log('Tasks not visible, ignoring');
        }

      }
      return nstate;
    }

    case 'UPDATE_PROJECT': {
      const upd = (array: Project[]) => {
        return array.map((p) => {
          if (p.Name === action.project.Name) {
            return action.project;
          }
          return p;
        });
      };

      let field : 'pinnedProjects' | 'hiddenProjects' | 'unpinnedProjects' = 'pinnedProjects';

      if (action.project.Visibility === ProjectVisibility.Hidden) {
        field = 'hiddenProjects';
      } else if (action.project.Visibility === ProjectVisibility.Unpinned) {
        field = 'unpinnedProjects';
      }

      return { ...state,
        [field]: upd(state[field]),
      };
    }

    case 'FILTER_BY_NAME': {
      return { ...state, filter: { ...state.filter, name: action.name } };
    }

    case 'FILTER_CLEAR': {
      return { ...state, filter: { name: state.filter.name } };
    }

    case 'FILTER_BY_DATE': {
      const nfilter = { ...state.filter };
      nfilter[action.end ? 'end' : 'begin'] = action.date;
      return { ...state, filter: nfilter };
    }
  }
  return state;
};

export const [store, dispatch] = common.createStore(reducer, initialState);

export const dispatchProjectListUpdate = (days: number) => {
  dispatch((dispatch) => {
    common.get(`/habits/projects/${days}`, ((response:
      { Pinned: Project[], Unpinned: Project[], Hidden: Project[] }) => {
      dispatch({
        days,
        type: 'PROJECT_LIST',
        pinnedProjects: response.Pinned,
        hiddenProjects: response.Hidden,
        unpinnedProjects: response.Unpinned,
      });
    }));
  });
};
