import React from 'react';
import { Draggable } from "react-beautiful-dnd";
import { MdDragHandle } from "react-icons/md";

import { Task, taskFieldsFragment } from "../api";
import { useMutation } from '../hooks/useSubscription';

export type CTaskProps = {
  task: Task;
  index: number;
}

const STATUS_NAME = ['unset', 'complete', 'incomplete']

const UPDATE_TASK_STATUS_MUT = `
${taskFieldsFragment}

mutation updateTaskStatus($id: Int!, $status: Int!) {
  updateTaskStatus(input: {
    id: $id,
    status: $status
  }) {
    __typename,
    updatedTasks {
      ...taskFields
    }
  }
}
`;

export const CTask = (props: CTaskProps) => {
  const { task } = props;
  let nameString = task.name;

  const status = STATUS_NAME[task.status];

  const updateTaskStatus = useMutation(UPDATE_TASK_STATUS_MUT);

  const cycleTaskStatus = () => {
    updateTaskStatus({
      id: task.id,
      status: (task.status + 1) % 3,
    })
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
                <MdDragHandle />
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


