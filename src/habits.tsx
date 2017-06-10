import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as $ from 'jquery';
import * as moment from 'moment';
import * as redux from 'redux';

import * as common from './common';

///// BACKEND INTERACTION

export const SCOPE_BUCKET = 0;
export const SCOPE_DAY = 1;
export const SCOPE_MONTH = 2;
export const SCOPE_YEAR = 3;
export const SCOPE_WRAP = 4;

export interface Task extends common.Model {
  ID: number;
  Hours: number | null;
  Order: number;
  Scope: number;
  Name: string;
  // Derived statistics
  BestStreak: number | null;
  CompletedTasks: number | null;
  CompletionRate: number | null;
  TotalTasks: number | null;
  TotalTasksWithTime: number | null;
}

///// REDUX

type TaskList = Array<Task>;

interface ViewMonth extends common.CommonState {
  type: 'VIEW_MONTH';
  date: moment.Moment;
  scope: number;
  month: TaskList;
}

type HabitsState = ViewMonth;

interface MountScope {
  type: 'MOUNT_SCOPE';
  scope: number;
}

type HabitsAction = common.CommonAction | MountScope;

const initialState = {
  type: 'VIEW_MONTH',
  date: moment(),
  scope: 0
} as HabitsState;

const reducer = (state: HabitsState = initialState, action: HabitsAction): HabitsState => {
  state = common.commonReducer(state, action as common.CommonAction) as HabitsState;
  return state;
}

const store = common.makeStore(reducer);

////// REACT

export class CTask extends React.Component<{task: Task}, undefined>{
  render() {
    return <p>{this.props.task.Name}</p>
  }
}

export class Scope extends React.Component<{tasks: Array<Task>}, undefined> {

}

const HabitsRoot = common.connect()(class extends React.Component<HabitsState, undefined> {
  render() {
    return <div>
      <common.NotificationBar notifications={this.props.notifications} dismiss={this.props.dismissNotifications} />
    </div>
  }
});

document.addEventListener('DOMContentLoaded', () =>  {
  ///// INSTALL ROUTER
  common.installRouter("/habits#", `view/${moment().format(common.MONTH_FORMAT)}/0`, {
    view: (datestr: string, scopestr: string) => {
      let date = moment(datestr, common.MONTH_FORMAT);
      let scope = parseInt(scopestr, 10);
      store.dispatch((dispatch: redux.Dispatch<HabitsState>) => {
        common.get(dispatch, `/habits/in-month?date=${date.format(common.MONTH_FORMAT)}`, ((tasks: Array<Task>) => {
          tasks.forEach(common.processModel);          
          dispatch({type: 'MOUNT_SCOPE', scope: SCOPE_DAY} as HabitsAction);
          console.log(tasks);
        }));
      })
    }
  });

  ///// INSTALL WEBSOCKET
  type HabitMessage = {
    type: 'UPDATE_TASK';
  }

  common.makeSocket('habits/sync', (msg: any) => {
    console.log("Received message", msg);
  })
  
  ///// RENDER
  common.render('habits-root', store, <HabitsRoot />);
})
