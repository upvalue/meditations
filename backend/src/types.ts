export type Task = {
  id: number;
  name: string;
  minutes: number;
  status: number;
  scope: number;
  date: string;
  comment?: string;
  // Calculated on query
  completion_rate?: number;
  total_tasks?: number;
  completed_tasks?: number;
}

export type InputTaskMinutes = {
  id: number;
  minutes: number;
  scope: number;
}