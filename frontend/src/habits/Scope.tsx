import React, { useState, useEffect, useRef } from 'react';
import classNames from 'classnames';
import { Droppable } from 'react-beautiful-dnd';

import { CTask } from './CTask';
import { MdAdd } from 'react-icons/md';
import { taskFieldsFragment, Task } from '../api';
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
`;

type ScopeProps = {
  className?: string;
  title: string;
  date: string;
  tasks: ReadonlyArray<Task>;
}

/**
 * A scope contains tasks.
 */
export const Scope = (props: ScopeProps) => {
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
  };

  return (
    <Droppable
      droppableId={props.date}
      type="LIST"
    >
      {(provided, _snapshot) => (
        <div
          className={classNames('Scope', 'a-p2', props.className)}
          ref={provided.innerRef}
          {...provided.droppableProps}
        >
          <div className="flex justify-between items-center">
            <h4 className="a-my0 a-mt1 a-mx1 a-mb2">{props.title || 'no title'}</h4>
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

          <>
            <div >
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
        </div>
      )}
    </Droppable>
  )
}