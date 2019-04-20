import React, { useReducer } from 'react';
import { useState, useEffect } from 'react';
import { parse, differenceInCalendarYears, format } from 'date-fns';
import { RouteComponentProps } from '@reach/router';

import { formatDate, tasksByDate, Task, TaskEvent, taskFieldsFragment } from '../api';
import { HabitsPage } from './HabitsPage';
import { initialState, habitsReducer, habitsReducerLogged } from './HabitsContainerState';
import { useSubscription } from '../hooks/useSubscription';

interface HabitsContainerProps extends RouteComponentProps {
  date?: string;
}

const baseDate = new Date();

const TASK_EVENTS_QUERY = `
${taskFieldsFragment}

subscription habitsContainer {
  taskEvents {
    __typename
    ...on UpdatedTasksEvent {
      updatedTasks {
        ...taskFields
      }
    }
    ...on AddTaskEvent {
      newTask {
        ...taskFields
      }
    }
  }
}
`;

/**
 * Habits state container. Manages changes in route, subscription updates to habits store
 */
export const HabitsContainer = (props: HabitsContainerProps) => {
  const [prevDate, setPrevDate] = useState<string | undefined>(undefined);
  const [state, dispatch] = useReducer(habitsReducerLogged, initialState);

  // Make TypeScript happy. This will never be mounted without a date
  const date = props.date || '';

  const dateObj = parse(date, 'yyyy-MM', baseDate);

  // This handles tracking date changes and dispatching the appropriate query
  useEffect(() => {
    // Dispatch appropriate promise based on what has changed
    let changedYear = false;

    if (!prevDate) {
      changedYear = true;
      // tslint:disable-next-line
    } else if (props.date && Math.abs(differenceInCalendarYears(parse(prevDate, 'yyyy-MM', baseDate), parse(props.date, 'yyyy-MM', baseDate))) > 0) {
      changedYear = true;
    }

    const promise = tasksByDate(formatDate(dateObj), changedYear);

    setPrevDate(props.date);
    promise.then((res) => {
      dispatch({
        type: 'LOAD_TASKS',
        date,
        tasks: res.tasksByDate
      });
    });
  }, [props.date]);

  useSubscription(TASK_EVENTS_QUERY, (te: TaskEvent) => {
    // Figure out if the thing applies.
    // console.log('received ye task event', te);
    dispatch({
      type: 'TASK_EVENT',
      ...te,
    })
  });

  const { tasks } = state;

  return (
    <HabitsPage
      date={date}
      tasks={tasks}
    />
  );
};
