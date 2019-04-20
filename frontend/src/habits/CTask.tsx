import React, { useReducer } from 'react';
import { Draggable } from "react-beautiful-dnd";
import { MdCheckCircle } from "react-icons/md";

import { Task } from "../api";

export type CTaskProps = {
  task: Task;
  index: number;
}

export const CTask = (props: CTaskProps) => {
  const { task } = props;
  let nameString = task.name;

  // console.log(task);

  return (
    <Draggable
      draggableId={props.task.id.toString()}
      index={props.index}
      type="TASK"
    >
      {(provided, _snapshot) => (
        <div
          className="Task p2 mb2"
          {...provided.draggableProps}
          ref={provided.innerRef}
        >
          <div className="flex items-center justify-between"

          >
            {nameString}

            <div>
              <div
                className="flex items-center"
                {...provided.dragHandleProps}
              >
                <MdCheckCircle />
              </div>
            </div>
          </div>

          <div className="Comment mx2" dangerouslySetInnerHTML={{ __html: props.task.comment || '' }} />

          <p>{task.minutes}</p>

        </div >
      )}
    </Draggable>
  );
}


