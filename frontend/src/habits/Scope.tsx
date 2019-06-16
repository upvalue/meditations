import React from 'react';
import classNames from 'classnames';
import { Droppable } from 'react-beautiful-dnd';
import { Button } from '@upvalueio/third-coast';

import { Task } from '../api';
import { CTask } from './CTask';

interface ScopeProps {
  tasks: Partial<Task>;
}

export const Scope = (props: any) => {
  return (
    <div className={classNames('Scope', 'p2', props.className)} style={props.style}>
      <h4 className="my0 mt1 mx1 mb2">{props.title || 'no title'}</h4>

      <Droppable
        droppableId={props.date}
        type="LIST"
      >
        {(provided, _snapshot) => (
          <>
            <div ref={provided.innerRef} {...provided.droppableProps}>
              {props.tasks && props.tasks.map((task: any, i: number) => (
                <CTask
                  key={task.id}
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