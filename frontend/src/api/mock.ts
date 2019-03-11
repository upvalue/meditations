import {
  makeExecutableSchema,
} from 'graphql-tools';

import { typeDefs } from './mock/graphql-typedefs';
//import { typeDefs } from '../../../shared/graphql-typedefs';

console.log("hog and dog");

import { graphql } from 'graphql';
import { Task } from '.';

const tasks: Task[] = [
  {
    ID: 1,
    Name: 'Meditate',
    Minutes: 0,
    Status: 0,
  },
];

const resolvers = {
  Query: {
    tasks: () => {
      return tasks
    },
    tasksByDate: (param: any, args: any) => {
      return tasks
    },
  },
};

export const schema = makeExecutableSchema({ typeDefs, resolvers });

graphql(schema, `{ ping }`).then((result) => console.log(result));

export const gquery = (query: string) => graphql(schema, query);

const w: any = window;
w.gquery = gquery;
