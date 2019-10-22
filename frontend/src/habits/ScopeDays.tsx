import React from 'react';
import { Task, parseDate, formatDate } from '../api';
import groupBy from 'lodash/groupBy';
import sortBy from 'lodash/sortBy';
import { format, startOfMonth, eachDayOfInterval } from 'date-fns';
import { Scope } from './Scope';
import { endOfMonth } from 'date-fns/esm';

export type ScopeDaysProps = {
  className?: string;
  date: Date;
  tasks: ReadonlyArray<Task>;
}

export const ScopeDays = (props: ScopeDaysProps) => {
  const { tasks, date } = props;

  const days = groupBy(tasks, t => formatDate(parseDate(t.date.split(' ')[0])));

  const start = startOfMonth(date);
  let end = endOfMonth(date);

  const now = new Date();

  if (end > now) {
    end = now;
  }

  if (end > start) {
    // Ensure that days before the current day are given a scope, even with no tasks
    eachDayOfInterval({ start, end }).forEach(day => {
      const key = formatDate(day);

      if (!days[key]) days[key] = [];
    });
  }


  return <section className="flex flex-column">
    {sortBy(Object.keys(days), day => {
      // Sort days by date since it is an object
      const dateObj = parseDate(day.split(' ')[0]);
      return 0 - dateObj.getTime();
    }).map(day => {
      const dateObj = parseDate(day.split(' ')[0]);

      return (
        <Scope
          className="days"
          key={dateObj.getTime()}
          title={format(dateObj, 'iiii do')}
          date={day}
          tasks={days[day].sort((a, b) => a.position - b.position)}
        />
      );
    })}
  </section>
}