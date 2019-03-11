import { gql } from 'apollo-server';

export const typeDefs = gql`
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
    CompletionRate: Int
    TotalTasks: Int
    CompletedTasks: Int
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
    Month: [Task]
    Year: [Task]
  }

  type Query {
    tasks: [Task]
    tasksByDate(date: String!, scopes: [TaskScope]): TasksByDateResponse
  }

  type Mutation {
    updateTask(taskId: Int!, task: InputTask!): [Task]
  }
`;
