import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as $ from 'jquery';
import * as moment from 'moment';
import { connect } from 'react-redux';
import { createStore } from 'redux';

import * as common from './common';

///// BACKEND INTERACTION

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

type HabitsAction = common.CommonAction;

const initialState = {
  type: 'VIEW_MONTH',
  date: moment(),
  scope: 0
} as HabitsState;

const reducer = (state: HabitsState = initialState): HabitsState => {
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

const HabitsRoot = connect((state) => state)(class extends React.Component<HabitsState, undefined> {
  dismiss() {
    store.dispatch({type: 'NOTIFICATIONS_CLOSE'} as common.CommonAction)
  }
  
  render() {
    return <div>
      {this.props.notifications ? <common.NotificationBar dismiss={() => this.dismiss()} notifications={this.props.notifications} /> : ''}
      <p>Notification bar</p>
    </div>
  }
});

document.addEventListener('DOMContentLoaded', () =>  {
  ///// INSTALL ROUTER
  common.installRouter("/habits#", `view/${moment().format(common.MONTH_FORMAT)}/0`, {
    view: (datestr: string, scopestr: string) => {
      let date = moment(datestr, common.MONTH_FORMAT);
      let scope = parseInt(scopestr, 10);
      store.dispatch(dispatch => {
        common.get(dispatch, `/habits/in-month?date=${date.format(common.MONTH_FORMAT)}`, ((tasks: Array<Task>) => {
          tasks.forEach(common.processModel);          
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
