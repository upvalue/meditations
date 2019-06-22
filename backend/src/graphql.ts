import fs from 'fs';

import { UserInputError, PubSub } from 'apollo-server';
import { gql } from 'apollo-server-express';
import { parse, isValid, format } from 'date-fns';

import { tasksInScope, updateTaskMinutes, addTask, updateTaskStatus, tasksInMonth, updateTaskPosition } from './model';

import { InputTaskMinutes, InputTaskPosition, InputTaskNew, InputTaskStatus, Task } from './types';

type ScopeName = 'DAY' | 'MONTH' | 'YEAR';

type TasksByDateArgs = {
  date: string,
  scopes: ReadonlyArray<ScopeName>,
};

type TasksInMonthArgs = {
  date: string;
}

type UpdateTaskArgs = {
  input: InputTaskMinutes;
}

type UpdateTaskPositionArgs = {
  sessionId: string;
  input: InputTaskPosition;
}

type AddTaskArgs = {
  input: InputTaskNew;
}

type Context = {
  sessionId: string;
}

const typeDefs = gql(fs.readFileSync(__dirname.concat('/schema.gql'), 'utf8'));

const pubsub = new PubSub();

// Subscription names
const TASK_EVENTS = 'TASK_EVENTS';
const ADD_TASK = 'ADD_TASK';
const TASK_POSITIONS = 'TASK_POSITIONS';

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


/**
 * Publish task updates and return updated tasks
 * @param updatedTasks 
 */
const updateTasks = (updatedTasks: ReadonlyArray<Task>) => {
  pubsub.publish(TASK_EVENTS, { taskEvents: { updatedTasks } });
  return { updatedTasks };
}

const withSessionId = <T>(ctx: Context, obj: T) => {
  return {
    ...obj,
    sessionId: ctx.sessionId || 'unknown',
  };
};


// Resolvers define the technique for fetching the types in the
// schema.  We'll retrieve books from the "books" array above.
const resolvers = {
  Query: {
    tasksByDate: (_param: any, args: TasksByDateArgs) => {
      checkDate(args.date);
      return Promise.all([
        //tasksInScope(format(parse(args.date, DATE_FORMAT, new Date()), 'yyyy-mm')),
        tasksInMonth(format(parse(args.date, DATE_FORMAT, new Date()), 'yyyy-mm')),
        tasksInScope(format(parse(args.date, DATE_FORMAT, new Date()), 'yyyy-mm')),
        tasksInScope(format(parse(args.date, DATE_FORMAT, new Date()), 'yyyy')),
      ]).then(([Days, Month, Year]) => {
        return {
          Days, Month, Year
        }
      });
    },
  },

  Mutation: {
    updateTaskMinutes: (_param: any, args: UpdateTaskArgs) => {
      return updateTaskMinutes(args.input).then(updatedTasks => {
        pubsub.publish(TASK_EVENTS, { taskEvents: { updatedTasks } });
        return { updatedTasks };
      });
    },

    updateTaskStatus: (_param: any, args: { input: InputTaskStatus }) => {
      return updateTaskStatus(args.input).then(updateTasks);
    },

    updateTaskPosition: (param: any, args: UpdateTaskPositionArgs, ctx: Context) => {
      // pubsub.publish()
      return updateTaskPosition(args.input).then((taskPosition: any) => {
        const res = {
          taskPosition,
        };

        pubsub.publish(TASK_POSITIONS, withSessionId(ctx, {
          taskPosition: withSessionId(ctx, res),
        }));

        return withSessionId(ctx, res);
      });
    },

    addTask: (_param: any, args: AddTaskArgs, ctx: Context) => {
      return addTask(args.input).then((newTaskList: any) => {
        const res = {
          newTask: newTaskList[0],
        };

        pubsub.publish(ADD_TASK, withSessionId(ctx, {
          addTask: withSessionId(ctx, res),
        }));

        return withSessionId(ctx, res);
      })

    },
  },

  Subscription: {
    taskEvents: {
      subscribe: () => pubsub.asyncIterator([TASK_EVENTS]),
    },

    addTask: {
      subscribe: () => pubsub.asyncIterator([ADD_TASK]),
    },

    taskPosition: {
      subscribe: () => pubsub.asyncIterator([TASK_POSITIONS]),
    }
  },
};

export { typeDefs, resolvers };