import { UserInputError, ApolloServer, gql, PubSub } from 'apollo-server';
import { parse, isValid, format } from 'date-fns';
import groupBy from 'lodash/groupBy';

import { Task, tasksInScope } from './model';

import { typeDefs } from './graphql-typedefs';

const pubsub = new PubSub();

const TASK_EVENTS = 'TASK_EVENTS';

type ScopeName = 'DAY' | 'MONTH' | 'YEAR';

type TasksByDateArgs = {
  date: string,
  scopes: ReadonlyArray<ScopeName>,
};

type UpdateTaskArgs = {
  taskId: number;
  task: Partial<Task>;
}

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
  }

  /*
  Subscription: {
    taskEvents: {
      subscribe: () => pubsub.asyncIterator([TASK_EVENTS]),
    }
  }
  */
};

// In the most basic sense, the ApolloServer can be started
// by passing type definitions (typeDefs) and the resolvers
// responsible for fetching the data for those types.
const server = new ApolloServer({ typeDefs, resolvers });

export default server;
