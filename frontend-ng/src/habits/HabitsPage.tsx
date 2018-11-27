import { RouteComponentProps, Router } from '@reach/router';
import React from 'react';
import { DragDropContext } from 'react-beautiful-dnd';
import { HabitsMain } from './HabitsMain';
import { HabitsSidebar } from './HabitsSidebar';
import { format } from 'date-fns';

export interface HabitsPageProps extends RouteComponentProps { }

export const HabitsPage = (props: HabitsPageProps) => {
  return (
    <>
      <Router primary={false} className="flex">
        <HabitsSidebar path="browse/:date" />
      </Router>

      <DragDropContext
        onDragEnd={e => console.log('drag end, do something')}
      >
        <Router className="flex flex-auto" primary={false}>
          <HabitsMain path="browse/:date" />
        </Router>

      </DragDropContext>
    </>
  );
};
