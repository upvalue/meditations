import React, { useReducer } from 'react';
import { useState, useEffect } from 'react';
import { parse, differenceInCalendarYears } from 'date-fns';
import { RouteComponentProps } from '@reach/router';

import { formatDate, tasksByDate, taskFieldsFragment, TaskEvent } from '../api';
import { HabitsPage } from './HabitsPage';
import { initialState, habitsReducerLogged } from './HabitsContainerState';
import { useSubscription } from '../hooks/useSubscription';

interface HabitsContainerProps extends RouteComponentProps {
  date?: string;
}

const baseDate = new Date();

const ADD_TASK_SUB = `
${taskFieldsFragment}

subscription newTasks {
  addTask {
    __typename,
    sessionId,
    newTask {
      ...taskFields
    }
  }
}
`;

const UPDATED_TASKS_POSITION_SUB = `
${taskFieldsFragment}

subscription taskPositionEvent {
  taskPosition {
    __typename,
    sessionId, 
    taskPosition {
      id, 
      task {
        ...taskFields
      },
      oldPosition,
      oldDate,
      newPosition,
      newDate
    }
  }
}
`


const UPDATED_TASKS_SUB = `
${taskFieldsFragment}

subscription taskUpdates {
  taskEvents {
    __typename,
    sessionId,
    updatedTasks {
      ...taskFields
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
    } else if (date && Math.abs(differenceInCalendarYears(parse(prevDate, 'yyyy-MM', baseDate), parse(date, 'yyyy-MM', baseDate))) > 0) {
      changedYear = true;
    }

    const promise = tasksByDate(formatDate(dateObj), changedYear);

    setPrevDate(date);
    promise.then((res) => {
      dispatch({
        type: 'LOAD_TASKS',
        date,
        tasks: res.tasksByDate
      });
    });
  }, []);

  useSubscription([ADD_TASK_SUB, UPDATED_TASKS_SUB, UPDATED_TASKS_POSITION_SUB], (te: TaskEvent) => {
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
