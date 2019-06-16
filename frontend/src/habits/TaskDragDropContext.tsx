import React from 'react';
import { DragDropContext, DropResult } from "react-beautiful-dnd";
import { taskFieldsFragment } from "../api";

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
    updatedTasks {

    }
  }
}
`;

export const TaskDragDropContext = (props: TaskDragDropContextProps) => {
  const updateTaskPosition = (e: DropResult) => {

    console.log(e);


  }

  return (
    <DragDropContext
      onDragEnd={updateTaskPosition}
    >
      {props.children}
    </DragDropContext>
  );

}