import * as React from 'react';
import * as renderer from 'react-test-renderer';

import { Task } from '../habits/state';
import { CTaskImpl } from '../habits/components/Task';
import * as moment from 'moment';
import { ModalProvider } from '../common/modal';

const testTask = (name: string) => {
  return {
    ID: 0,
    Name: name,
    CreatedAt: moment(),
    UpdatedAt: moment(),
    DeletedAt: null,
    Date: moment(),
    Hours: 0,
    Minutes: 0,
    Order: 0,
    Status: 0,
    Scope: 0,
    Streak: 0,
    BestStreak: 0,
    CompletedTasks: 0,
    CompletionRate: 0,
    TotalTasks: 0,
    TotalTasksWithTime: 0,
  } as Task;
};

const renderTask = (task: Task) => {
  return renderer.create(
    <ModalProvider socketClosed={false}>
      <CTaskImpl
        task={task}
        lastModified={false}
        connectDragSource={el => el}
        connectDragPreview={el => el}
        connectDropTarget={el => el}
        isDragging={false}
        isOver={false}
        style={null}
        isOverCurrent={false}
      />
    </ModalProvider>,
  );
};

test('task renders', () => {
  const task = renderTask(testTask('Diet'));

  expect(task.root.findAllByType('button')[0].children).toEqual(['Diet']);
});
