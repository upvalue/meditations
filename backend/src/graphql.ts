import fs from 'fs';

import { UserInputError, PubSub } from 'apollo-server';
import { gql } from 'apollo-server-express';
import { parse, isValid, format } from 'date-fns';
import groupBy from 'lodash/groupBy';

import { tasksInScope, updateTask, addTask } from './model';

import { InputTaskMinutes, InputTaskNew } from './types';

const typeDefs = gql(fs.readFileSync(__dirname.concat('/schema.gql'), 'utf8'));

const pubsub = new PubSub();

const TASK_EVENTS = 'TASK_EVENTS';

/**
 * Subscription ID. Unique across instances of meditations, doesn't need to be persisted so
 * simply kept in a variable
 */
let subscriptionSessionId = 1;

type ScopeName = 'DAY' | 'MONTH' | 'YEAR';

type TasksByDateArgs = {
  date: string,
  scopes: ReadonlyArray<ScopeName>,
};

const DATE_FORMAT = 'yyyy-mm-dd';

const checkDate = (date: string) => {
  if (!isValid(parse(date, DATE_FORMAT, new Date()))) {
    throw new UserInputError(`date "${date}" must match format YYYY-MM-DD`);
  }
}

const SCOPE_NAMES: { [key: number]: string } = {
  1: 'Days',
  2: 'Month',
  3: 'Year',
}

const SCOPE_NUMBERS: { [key: string]: number } = {
  'DAY': 1,
  'MONTH': 2,
  'YEAR': 3,
};

type TasksInMonthArgs = {
  date: string;
}

type UpdateTaskArgs = {
  input: InputTaskMinutes;
}

type AddTaskArgs = {
  sessionId: number;
  input: InputTaskNew;
}

// Resolvers define the technique for fetching the types in the
// schema.  We'll retrieve books from the "books" array above.
const resolvers = {
  Query: {
    tasksInMonth: (_param: any, args: TasksInMonthArgs) => {
      checkDate(args.date);
      return tasksInScope(args.date, [1, 2]);
    },

    tasksInYear: (_param: any, args: TasksInMonthArgs) => {
      checkDate(args.date);
      return tasksInScope(format(parse(args.date, DATE_FORMAT, new Date()), 'yyyy'), [3]);
    },

    tasksByDate: (_param: any, args: TasksByDateArgs) => {
      checkDate(args.date);
      return Promise.all([
        tasksInScope(format(parse(args.date, DATE_FORMAT, new Date()), 'yyyy-mm'), [1]),
        tasksInScope(args.date, [2]),
        tasksInScope(format(parse(args.date, DATE_FORMAT, new Date()), 'yyyy'), [3]),
      ]).then(res => {
        const tasks = [...res[0], ...res[1], ...res[2]];
        return groupBy(tasks, t => SCOPE_NAMES[t.scope]);
      });
    },
  },

  Mutation: {
    updateTask: (_param: any, args: UpdateTaskArgs) => {
      return updateTask(args.input).then(updatedTasks => {
        pubsub.publish(TASK_EVENTS, { taskEvents: { updatedTasks } });
        return { updatedTasks };
      });
    },

    addTask: (_param: any, args: AddTaskArgs) => {
      return addTask(args.input).then((newTaskList: any) => {
        const newTask = newTaskList[0];

        pubsub.publish(TASK_EVENTS, {
          taskEvents: { newTask }
        });

        return {
          sessionId: args.sessionId,
          newTask,
        };
      })

    },

    newSubscriptionSession: (_param: any, args: any) => {
      return subscriptionSessionId++;
    }
  },

  Subscription: {
    taskEvents: {
      subscribe: () => pubsub.asyncIterator([TASK_EVENTS]),
    }
  },

  TaskEvent: {
    __resolveType: (obj: any, context: any, info: any) => {
      if (obj.updatedTasks) {
        return 'UpdatedTasksEvent';
      } else if (obj.newTask) {
        return 'AddTaskEvent';
      }
      console.error('UNABLE TO RESOLVE TYPE FOR TaskEvent ', obj);
      return 'UpdatedTasksEvent';
    }
  },
};

export { typeDefs, resolvers };