import React, { useState, useEffect, useRef } from 'react';
import classNames from 'classnames';
import { Droppable } from 'react-beautiful-dnd';

import { CTask } from './CTask';
import { MdAdd } from 'react-icons/md';
import { taskFieldsFragment } from '../api';
import { useMutation } from '../hooks/useSubscription';

const NEW_TASK_QUERY = `
${taskFieldsFragment}

mutation newTask($date: String!, $name: String!) {
  addTask(input:{
    date: $date,
    name: $name,
    scope: 1
  }) {
    __typename, 
    newTask {
      ...taskFields
    }
  }
}
`

/**
 * A scope contains tasks.
 */
export const Scope = (props: any) => {
  const [addingTask, setAddingTask] = useState(false);
  const [taskName, setTaskName] = useState('');
  const taskNameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const current = taskNameRef.current;
    if (!current) return;

    current.focus();
  }, [taskNameRef.current]);

  const newTask = useMutation(NEW_TASK_QUERY);

  const addTask = () => {
    newTask({
      name: taskName,
      date: props.date,
    });

    setAddingTask(false);
  }

  return (
    <div className={classNames('Scope', 'p2', props.className)} style={props.style}>
      <div className="flex justify-between items-center">
        <h4 className="my0 mt1 mx1 mb2">{props.title || 'no title'}</h4>
        <div style={{ cursor: 'pointer' }}>
          {addingTask &&
            <input
              placeholder="task name"
              size={5}
              value={taskName}
              onChange={(e) => setTaskName(e.currentTarget.value)}
              onBlur={addTask}
              ref={taskNameRef}
            />
          }
          <MdAdd onClick={() => setAddingTask(true)} />
        </div>
      </div>

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