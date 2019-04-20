import { RouteComponentProps, Router } from '@reach/router';
import React from 'react';
import { DragDropContext } from 'react-beautiful-dnd';
import { HabitsMain } from './HabitsMain';
import { format, parse } from 'date-fns';
import { View } from '@upvalueio/third-coast';

import { HabitsSidebar } from './HabitsSidebar';
import { ScopeContainer } from './ScopeContainer';
import { ScopeDays } from './ScopeDays';
import { TasksByDateRequest } from '../api';


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

      <DragDropContext
        onDragEnd={e => console.log('drag end, do something')}
      >
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


      </DragDropContext>
    </>
  );
};
