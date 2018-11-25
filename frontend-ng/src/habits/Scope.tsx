import React from 'react';
import classNames from 'classnames';
import { Droppable } from 'react-beautiful-dnd';
import { Button } from '@upvalueio/third-coast';

import { Task } from './Task';

export const Scope = (props: any) => {
  return (
    <div className={classNames('Scope', 'p2', props.className)} style={props.style}>
      <h4 className="my0 mt1 mx1 mb2">{props.name || 'November'}</h4>

      {/*<div className="Task mt3 mb1 p2">
        <Button intent="secondary">
          Diet 15/18 (83%)
        </Button>
        <p contentEditable={true}
          className="Comment mt3 ml3 mb1">This is a comment about ultimate power</p>
  </div>*/}

      <Droppable
        droppableId={props.name || 'November'}
        type="LIST"
      >
        {(provided, snapshot) => (
          <>
            <div ref={provided.innerRef} {...provided.droppableProps}>
              {props.tasks && props.tasks.map((task: any, i: number) => (
                <Task
                  key={task.ID}
                  taskId={task.ID}
                  index={i}
                  task={task}
                />
              ))}

              {provided.placeholder}
            </div>
          </>
        )}
      </Droppable>

      <div>
        <Button minimal={true}>
          butens go here
        </Button>
      </div>
    </div>
  )
}