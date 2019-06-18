export const typeDefs = `
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

# Task events

type UpdatedTasksEvent {
  sessionId: String!
  updatedTasks: [Task!]
}

type AddTaskEvent {
  sessionId: String!
  newTask: Task!
}

union TaskEvent = UpdatedTasksEvent | AddTaskEvent

input InputTaskMinutes {
  id: Int!
  scope: Int
  minutes: Int
}

input InputTaskCycleStatus {
  id: Int!
  status: Int!
}

input InputTaskNew {
  name: String!
  date: String!
  scope: Int!
}

input InputTaskPosition {
  id: Int!
  date: String!
  scope: Int!
  position: Int!
}

type Mutation {
  updateTask(input: InputTaskMinutes!): UpdatedTasksEvent
  addTask(input: InputTaskNew): AddTaskEvent
  updateTaskMinutes(input: InputTaskMinutes!): UpdatedTasksEvent
  updateTaskStatus(input: InputTaskCycleStatus!): UpdatedTasksEvent
  updateTaskPosition(sessionId: String!, input: InputTaskPosition!): UpdatedTasksEvent
}

type Subscription {
  taskEvents: TaskEvent
  addTask: AddTaskEvent
}`
