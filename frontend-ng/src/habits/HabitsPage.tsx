import { RouteComponentProps, Router } from '@reach/router';
import React from 'react';
import { DragDropContext } from 'react-beautiful-dnd';
import { HabitsMain } from './HabitsMain';
import { HabitsSidebar } from './HabitsSidebar';

export interface HabitsPageProps extends RouteComponentProps { }

export const HabitsPage = (props: HabitsPageProps) => {
  return (
    <>
      <Router primary={false} className="flex">
        <HabitsSidebar path="/habits/browse/:date" />
        <HabitsSidebar default={true} />
      </Router>

      <DragDropContext
        onDragEnd={e => console.log('drag end, do something')}
      >
        <Router className="flex flex-auto">
          <HabitsMain path="/habits/browse/:date" />
        </Router>

      </DragDropContext>
    </>
  );
};
