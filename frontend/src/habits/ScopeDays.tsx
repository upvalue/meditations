import React from 'react';
import { Task, parseDate } from '../api';
import groupBy from 'lodash/groupBy';
import { format } from 'date-fns';
import { ScopeContainer } from './ScopeContainer';

export type ScopeDaysProps = {
  className?: string;
  tasks: ReadonlyArray<Partial<Task>>;
}

export const ScopeDays = (props: ScopeDaysProps) => {
  const { tasks } = props;
  const days = groupBy(tasks, t => t.date);
  return <section className="flex flex-column">
    {Object.keys(days).map(day => {
      const dateObj = parseDate(day.split(' ')[0]);
      return <ScopeContainer
        key={dateObj.getTime()}
        title={format(dateObj, 'yyyy-MM-dd')}
        date={day}
        tasks={days[day]}
      />
    })}
  </section>
}