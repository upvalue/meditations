import React, { useEffect } from 'react';

import { Link, RouteComponentProps } from '@reach/router';
import { View } from '@upvalueio/third-coast';
import { MdChevronRight, MdArrowForward, MdChevronLeft, MdArrowBack } from 'react-icons/md';

import { IconLink } from '../components/IconButton';
import { parseDate } from '../api';
import { parse, format, subMonths, addMonths, addYears, subYears } from 'date-fns';

export interface HabitsSidebarProps extends RouteComponentProps {
  date?: string;
}

const baseDate = new Date;

export const HabitsSidebar = (props: HabitsSidebarProps) => {
  const date = props.date ? parse(props.date, 'yyyy-MM', baseDate) : new Date;

  const prevMonth = format(subMonths(date, 1), 'yyyy-MM');
  const nextMonth = format(addMonths(date, 1), 'yyyy-MM');
  const nextYear = format(addYears(date, 1), 'yyyy-MM');
  const prevYear = format(subYears(date, 1), 'yyyy-MM');

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
        <span>some other controls or whatever</span>
      </View>

    </View>
  )

}