import fs from 'fs';

import { UserInputError, PubSub } from 'apollo-server';
import { gql } from 'apollo-server-express';
import { parse, isValid, format } from 'date-fns';

import { tasksInScope, updateTaskMinutes, addTask, updateTaskStatus, tasksInMonth, updateTaskPosition } from './model';
import { MutationUpdateTaskArgs, MutationUpdateTaskStatusArgs, MutationUpdateTaskPositionArgs, MutationAddTaskArgs, QueryTasksByDateArgs } from './types-generated';

type Context = {
  sessionId: string;
}

const typeDefs = gql(fs.readFileSync(__dirname.concat('/schema.gql'), 'utf8'));

const pubsub = new PubSub();

// Subscription names

const TASK_EVENTS = 'taskEvents';
const ADD_TASK = 'addTask';
const TASK_POSITIONS = 'taskPosition';


const DATE_FORMAT = 'yyyy-mm-dd';

const checkDate = (date: string) => {
  if (!isValid(parse(date, DATE_FORMAT, new Date()))) {
    throw new UserInputError(`date "${date}" must match format YYYY-MM-DD`);
  }
}

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

/**
 * Publish and return a mutation with sessionId attached
 * @param ctx 
 * @param triggerName 
 * @param subscriptionName 
 * @param obj 
 */
const publishMutation = <T>(ctx: Context, triggerName: string, obj: T) => {
  pubsub.publish(triggerName, { [triggerName]: withSessionId(ctx, obj) });
  return obj;
}

const resolvers = {
  Query: {
    tasksByDate: (_param: any, args: QueryTasksByDateArgs) => {
      checkDate(args.date);
      return Promise.all([
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
    updateTaskMinutes: (_param: any, args: MutationUpdateTaskArgs) => {
      return updateTaskMinutes(args.input).then(updatedTasks => {
        pubsub.publish(TASK_EVENTS, { taskEvents: { updatedTasks } });
        return { updatedTasks };
      });
    },

    updateTaskStatus: (_param: any, args: MutationUpdateTaskStatusArgs, ctx: Context) => {
      return updateTaskStatus(args.input).then(updatedTasks => {
        return publishMutation(ctx, TASK_EVENTS, { updatedTasks });
      });
    },

    updateTaskPosition: (param: any, args: MutationUpdateTaskPositionArgs, ctx: Context) => {
      // pubsub.publish()
      return updateTaskPosition(args.input).then((taskPosition: any) => {
        return publishMutation(ctx, TASK_POSITIONS, { taskPosition });
      });
    },

    addTask: (_param: any, args: MutationAddTaskArgs, ctx: Context) => {
      return addTask(args.input).then((newTaskList: any) => {
        return publishMutation(ctx, ADD_TASK, { newTask: newTaskList[0] });
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