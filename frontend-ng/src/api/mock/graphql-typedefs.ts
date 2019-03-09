export const typeDefs = `
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