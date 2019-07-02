import React from 'react';
import { parse, format, subMonths, addMonths, addYears, subYears } from 'date-fns';
import { RouteComponentProps } from '@reach/router';
import { View, Input } from '@upvalueio/third-coast';
import { MdChevronRight, MdArrowForward, MdChevronLeft, MdArrowBack } from 'react-icons/md';

import { IconLink } from '../base/IconButton';
import { useMutation } from '../hooks/useSubscription';
import { taskFieldsFragment, formatDate } from '../api';

export interface HabitsSidebarProps extends RouteComponentProps {
  date?: string;
}

const baseDate = new Date();

const NEW_TASK_QUERY = `
${taskFieldsFragment}

mutation newTask($date: String!, $name: String!) {
  addTask(input:{
    date: $date,
    name: $name,
    scope: 1
  }) {
    __typename, 
    newTask {
      ...taskFields
    }
  }
}
`

export const HabitsSidebar = (props: HabitsSidebarProps) => {
  const date = props.date ? parse(props.date, 'yyyy-MM', baseDate) : new Date();

  const prevMonth = format(subMonths(date, 1), 'yyyy-MM');
  const nextMonth = format(addMonths(date, 1), 'yyyy-MM');
  const nextYear = format(addYears(date, 1), 'yyyy-MM');
  const prevYear = format(subYears(date, 1), 'yyyy-MM');

  const addTask = useMutation(NEW_TASK_QUERY);

  return (
    <View flex="flex-column" className="Sidebar-container">
      <View className="Sidebar" flex={['flex-column', 'flex-auto']}>
        <div className="flex justify-between items-center">
          <div className="flex">
            {/* What this needs is a double arrow like a VHS rewind */}
            <IconLink
              icon={MdChevronLeft}
              to={`/habits/browse/${prevYear}`}
            />

            <IconLink
              icon={MdArrowBack}
              to={`/habits/browse/${prevMonth}`}
            />
          </div>

          <div
            className="flex-auto"
            style={{ textAlign: 'center' }}
          >
            <h3 className="m0">
              {format(date, 'MMMM yyyy')}
            </h3>
          </div>

          <div className="flex">
            <IconLink
              icon={MdArrowForward}
              to={`/habits/browse/${nextMonth}`}
            />

            <IconLink
              icon={MdChevronRight}
              to={`/habits/browse/${nextYear}`}
            />
          </div>
        </div>
        <div>

          <Input width={35} placeholder="Task name" onBlur={(e) => {
            if (e.target.value === '') return;
            addTask({
              name: e.target.value,
              date: formatDate(new Date()),
            });

            e.target.value = '';
          }} />
        </div>
      </View>


    </View>
  )

}