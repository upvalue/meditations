import React from 'react';
import { Task, parseDate, formatDate } from '../api';
import groupBy from 'lodash/groupBy';
import sortBy from 'lodash/sortBy';
import { format } from 'date-fns';
import { ScopeContainer } from './ScopeContainer';

export type ScopeDaysProps = {
  className?: string;
  tasks: ReadonlyArray<Task>;
}

export const ScopeDays = (props: ScopeDaysProps) => {
  const { tasks } = props;
  const days = groupBy(tasks, t => formatDate(parseDate(t.date.split(' ')[0])));
  return <section className="flex flex-column">
    {sortBy(Object.keys(days), day => {
      const dateObj = parseDate(day.split(' ')[0]);
      return 0 - dateObj.getTime();
    }).map(day => {
      const dateObj = parseDate(day.split(' ')[0]);
      return (
        <ScopeContainer
          key={dateObj.getTime()}
          title={format(dateObj, 'iiii do')}
          date={day}
          tasks={days[day]}
        />
      );
    })}
  </section>
}