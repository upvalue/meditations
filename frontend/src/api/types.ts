
export interface Task {
  id: number;
  name: string;
  minutes: number;
  status: number;
  date: string;
  comment?: string;
  // Calculated on query
  completion_rate?: number;
  total_tasks?: number;
  completed_tasks?: number;
}

