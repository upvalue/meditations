"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const apollo_server_1 = require("apollo-server");
const date_fns_1 = require("date-fns");
const model_1 = require("./model");
const pubsub = new apollo_server_1.PubSub();
const TASK_EVENTS = 'TASK_EVENTS';
const typeDefs = apollo_server_1.gql `
  enum TaskScope {
    DAY,
    MONTH,
    YEAR
  }

  type Task {
    ID: Int!
    Name: String!
    CreatedAt: String!
    UpdatedAt: String
    Date: String
    Status: Int
    Scope: Int
    Position: Int
    Minutes: Int
    Comment: String
  }

  input InputTask {
    Name: String
    CreatedAt: String
    UpdatedAt: String
    Date: String
    Status: Int
    Scope: Int
    Position: Int
    Minutes: Int
  }

  type TasksByDateResponse {
    Days: [Task]
    Months: [Task]
    Year: [Task]
  }

  type Query {
    tasks: [Task]
    tasksByDate(date: String!, scopes: [TaskScope]): [Task]
  }

  type Mutation {
    updateTask(taskId: Int!, task: InputTask!): [Task]
  }
`;
const DATE_FORMAT = 'yyyy-mm-dd';
const checkDate = (date) => {
    if (!date_fns_1.isValid(date_fns_1.parse(date, 'yyyy-mm-dd', new Date()))) {
        throw new apollo_server_1.UserInputError(`date "${date}" must match format YYYY-MM-DD`);
    }
};
// Resolvers define the technique for fetching the types in the
// schema.  We'll retrieve books from the "books" array above.
const resolvers = {
    Query: {
        tasks: model_1.tasks,
        tasksByDate: (param, args, thing) => {
            checkDate(args.date);
            console.log('ye parameter', param);
            return model_1.tasksByDate(args.date, false);
        },
    },
    Mutation: {
        updateTask: (param, args) => {
            return model_1.updateTask(args.taskId, args.task);
        },
    },
};
// In the most basic sense, the ApolloServer can be started
// by passing type definitions (typeDefs) and the resolvers
// responsible for fetching the data for those types.
const server = new apollo_server_1.ApolloServer({ typeDefs, resolvers });
exports.default = server;
