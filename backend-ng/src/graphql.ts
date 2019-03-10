import { UserInputError, ApolloServer, gql, PubSub } from 'apollo-server';
import { parse, isValid } from 'date-fns';

import { Task, tasks, tasksByDate, updateTask } from './model';

import { typeDefs } from './graphql-typedefs';

const pubsub = new PubSub();

const TASK_EVENTS = 'TASK_EVENTS';


type TasksByDateArgs = {
  date: string
};

type UpdateTaskArgs = {
  taskId: number;
  task: Partial<Task>;
}

const DATE_FORMAT = 'yyyy-mm-dd';

const checkDate = (date: string) => {
  if (!isValid(parse(date, 'yyyy-mm-dd', new Date()))) {
    throw new UserInputError(`date "${date}" must match format YYYY-MM-DD`);
  }
}

// Resolvers define the technique for fetching the types in the
// schema.  We'll retrieve books from the "books" array above.
const resolvers = {
  Query: {
    tasks,

    tasksByDate: (param: any, args: TasksByDateArgs, thing: any) => {
      checkDate(args.date);
      return tasksByDate(args.date, false);
    },

  },

  Mutation: {
    updateTask: (param: any, args: UpdateTaskArgs) => {
      return updateTask(args.taskId, args.task);
    },
  },

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
