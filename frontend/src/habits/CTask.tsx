import React from 'react';
import { Draggable } from "react-beautiful-dnd";
import { MdCheckCircle } from "react-icons/md";

import { Task } from "../api";

export type CTaskProps = {
  task: Task;
  index: number;
}

const STATUS_NAME = ['unset', 'complete', 'incomplete']

export const CTask = (props: CTaskProps) => {
  const { task } = props;
  let nameString = task.name;

  const status = STATUS_NAME[task.status];

  const cycleTaskStatus = () => {

  }

  return (
    <Draggable
      draggableId={task.id.toString()}
      index={props.index}
      type="TASK"
    >
      {(provided, _snapshot) => (
        <div
          className="Task p2 mb2"
          {...provided.draggableProps}
          ref={provided.innerRef}
        >
          <div className="flex items-center justify-between">
            <span className={`Task-name Task-name-${status}`} onClick={cycleTaskStatus}>
              {nameString}
            </span>

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

          {/*<p>{task.minutes}</p>*/}
        </div >
      )}
    </Draggable>
  );
}


