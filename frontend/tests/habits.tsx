import * as renderer from 'react-test-renderer';

import { Task } from '../habits/state';
import { createCTask } from '../habits/components';
import * as moment from 'moment';

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

test('task renders', () => {
  const task1 = createCTask(1, testTask('Diet'));

  // renderer.create(task1);

  // const component = renderer.create(task1);
});
