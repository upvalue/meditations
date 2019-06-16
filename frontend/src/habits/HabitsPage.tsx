import React from 'react';
import { DragDropContext, DropResult } from 'react-beautiful-dnd';
import { format, parse } from 'date-fns';
import { View } from '@upvalueio/third-coast';

import { HabitsSidebar } from './HabitsSidebar';
import { ScopeContainer } from './ScopeContainer';
import { ScopeDays } from './ScopeDays';
import { TasksByDateRequest, taskFieldsFragment } from '../api';
import { TaskDragDropContext } from './TaskDragDropContext';


export interface HabitsPageProps {
  date: string;
  tasks: TasksByDateRequest['tasksByDate'] | null;
}

const baseDate = new Date();

export const HabitsPage = (props: HabitsPageProps) => {
  const { tasks, date } = props;

  const dateObj = parse(date, 'yyyy-MM', baseDate);

  return (
    <>
      <HabitsSidebar
        date={props.date}
      />

      <TaskDragDropContext>
        <main className="m3 flex-auto">
          <View className="higher-scopes" flex="flex">
            {tasks &&
              <>

                <ScopeDays
                  className="mr2"
                  tasks={tasks.Days}
                />

                <ScopeContainer
                  title={format(dateObj, 'MMMM')}
                  className="mr2"
                  date={date}
                  tasks={tasks.Month}
                />

                <ScopeContainer
                  title={format(dateObj, 'yyyy')}
                  date={date}
                  tasks={tasks.Year}
                />
              </>
            }
          </View>
        </main>
      </TaskDragDropContext>
    </>
  );
};
