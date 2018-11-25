import React from 'react';
import classNames from 'classnames';
import { Droppable } from 'react-beautiful-dnd';
import { Button } from '@upvalueio/third-coast';

import { Task } from './Task';

export const Scope = (props: any) => {
  return (
    <div className={classNames('Scope', 'p2', props.className)} style={props.style}>
      <h4 className="my0 mt1 mx1 mb2">{props.name || 'November'}</h4>

      <Droppable
        droppableId={props.name || 'November'}
        type="LIST"
      >
        {(provided, _snapshot) => (
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
    </div>
  )
}