import React from 'react';
import { Draggable } from "react-beautiful-dnd";
import { Button } from "@upvalueio/third-coast";
import { MdCheckCircle } from "react-icons/md";

import { cycleTaskStatus, TaskStatus } from "../api";

export const Task = (props: any) => {
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
      draggableId={props.taskId}
      index={props.index}
      type="TASK"
    >
      {(provided, _snapshot) => (
        <div
          className="Task p1 mb1"
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          ref={provided.innerRef}
        >
          <div className="flex items-center justify-between">
            {/*<MdCheckCircle color={"green"} />
        <Button className="ml2" style={{ display: 'inline' }}>
          &nbsp;{props.children}
  </Button>*/}
            <Button
              onClick={cycleStatus}
              className={props.task ? TaskStatus[props.task.Status] : ''}
            >
              {props.children}
              {nameString}
            </Button>

            <div className="mr1">
              <MdCheckCircle />
            </div>
          </div>
          {
            props.comment &&
            <div className="Comment mt2 ml3 pb2">
              This is what a comment might look like. If it were really, really, really fwiggin long
        </div>
          }
        </div >
      )}
    </Draggable>
  );
}


