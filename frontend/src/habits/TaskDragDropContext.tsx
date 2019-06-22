import React from 'react';
import { DragDropContext, DropResult } from "react-beautiful-dnd";
import { taskFieldsFragment } from "../api";
import { useMutation } from '../hooks/useSubscription';

type TaskDragDropContextProps = {
  children: React.ReactNode;
}

const UPDATE_TASK_POSITION_MUT = `
${taskFieldsFragment}

mutation updateTaskPosition($sessionId: String!, $id: Int!, $date: String!, $position: Int!) {
  updateTaskPosition(sessionId: $sessionId, input: {
    id: $id,
    date: $date,
    position: $position
  }) {
    __typename,
    sessionId,
    taskPosition {
      id,
      task {
        ...taskFields
      },
      oldPosition,
      oldDate,
      newPosition,
      newDate
    }
  }
}
`;

/**
 * Handles creating react-beautiful-dnd context and sending off task movement mutations
 * @param props 
 */
export const TaskDragDropContext = (props: TaskDragDropContextProps) => {
  const updateTaskPosition = useMutation(UPDATE_TASK_POSITION_MUT);

  const onDragEnd = (e: DropResult) => {
    const { draggableId, destination } = e;

    if (!destination) return;

    updateTaskPosition({
      id: parseInt(draggableId, 10),
      date: destination.droppableId,
      position: destination.index,
    });
  }


  return (
    <DragDropContext
      onDragEnd={onDragEnd}
    >
      {props.children}
    </DragDropContext>
  );

}