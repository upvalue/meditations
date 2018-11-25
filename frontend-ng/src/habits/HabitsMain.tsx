import React from 'react';
import { useState, useEffect } from 'react';
import { View } from '@upvalueio/third-coast';

import { tasksByDate, TasksByDateRequest, formatDate, RequestScopeEnum } from '../api';
import { ScopeContainer } from './ScopeContainer';
import { parse, differenceInCalendarYears } from 'date-fns';
import { RouteComponentProps } from '@reach/router';

interface HabitsMainProps extends RouteComponentProps {
  date?: string;
}

const baseDate = new Date();

/**
 * Main page, takes care of data loading.
 */
export const HabitsMain = (props: HabitsMainProps) => {
  const [prevDate, setPrevDate] = useState<string | undefined>(props.date);
  const [tasks, setTasks] = useState<TasksByDateRequest | null>(null);

  // Make TypeScript happy. This will never be mounted without a date
  const date = props.date || '';

  const prevProps = props;

  // Here. We need to load all data when necessary, and some data on navigation
  useEffect(() => {
    // Dispatch appropriate promise based on what has changed
    let changedYear = false;

    console.log('changedYear', prevDate);
    if (!prevDate) {
      changedYear = true;
      // tslint:disable-next-line
    } else if (props.date && Math.abs(differenceInCalendarYears(parse(prevDate, 'yyyy-MM', baseDate), parse(props.date, 'yyyy-MM', baseDate))) > 0) {
      changedYear = true;
      console.log('calendar year changed, refetching all ye data');
      // The calendar year changed, refetch
    }

    const scopes: ReadonlyArray<RequestScopeEnum> =
      changedYear ? ['DAYS', 'MONTH', 'YEAR'] : ['DAYS', 'MONTH'];

    const promise = tasksByDate(formatDate(parse(date, 'yyyy-MM', baseDate)), scopes);

    setPrevDate(props.date);
    promise.then((res) => {
      console.log(res);
      setTasks(tasks ?
        {
          ...tasks,
          ...res,
        } : res);
    });
  }, [props.date]);

  return (
    <main className="m3 flex-auto">
      <View className="higher-scopes" flex="flex">
        {tasks &&
          <>

            <ScopeContainer
              className="mr2"
              date={date}
              tasks={tasks.tasksByDate.Month}
            />
            <ScopeContainer
              date={date}
              tasks={tasks.tasksByDate.Year}
            />
          </>
        }
      </View>
    </main>
  );
};
