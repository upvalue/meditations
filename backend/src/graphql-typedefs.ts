import { gql } from 'apollo-server'
export const typeDefs = gql`
enum TaskScope {
  DAY,
  MONTH,
  YEAR
}

type Task {
  id: Int!
  name: String!
  created_at: String!
  updated_at: String
  date: String
  status: Int
  scope: Int
  position: Int
  minutes: Int
  comment: String
  completion_rate: Int
  total_tasks: Int
  completed_tasks: Int
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
  tasksInMonth(date: String!): [Task]
  tasksInYear(date: String!): [Task]
  tasksByDate(date: String!, includeYear: Boolean!): TasksByDateResponse
}

type Mutation {
  updateTask(taskId: Int!, task: InputTask!): [Task]
}`
