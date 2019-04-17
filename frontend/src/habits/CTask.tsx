import React, { useReducer } from 'react';
import { Draggable } from "react-beautiful-dnd";
import { Button } from "@upvalueio/third-coast";
import { MdCheckCircle } from "react-icons/md";

type State = {
  messages: string[],
};

const Thing = () => {
  const [state, dispatch] = useReducer((state: State, action) => {

    return state;
  }, {
      messages: []
    })
}

import { cycleTaskStatus, TaskStatus, Task } from "../api";

export type CTaskProps = {
  task: Task;
  index: number;
}

export const CTask = (props: CTaskProps) => {
  let nameString = props.task && props.task.Name;

  if (props.task && props.task.CompletedTasks) {
    // tslint:disable-next-line
    nameString = `${nameString} ${props.task.CompletedTasks}/${props.task.TotalTasks} (${props.task.CompletionRate}%)`
  }

  const cycleStatus = () => {
    cycleTaskStatus(props.task);
  }

  return (
    <Draggable
      draggableId={props.task.ID.toString()}
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
            {/*<MdCheckCircle color={"green"} />
        <Button className="ml2" style={{ display: 'inline' }}>
          &nbsp;{props.children}
  </Button>*/}
            {/*<Button
              onClick={cycleStatus}
              className={props.task ? TaskStatus[props.task.Status] : ''}
            >
              {nameString}
            </Button>*/}
            {nameString}

            <div className="mr1">
              <div
                {...provided.dragHandleProps}
              >
                <MdCheckCircle />
              </div>
            </div>
          </div>

          <div className="Comment mx2" dangerouslySetInnerHTML={{ __html: props.task.Comment || '' }} />
        </div >
      )}
    </Draggable>
  );
}


