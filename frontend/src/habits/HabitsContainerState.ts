import { Task, TaskEvent } from "../api";

export type HabitsState = {
  date: string,
  tasks: {
    Days: ReadonlyArray<Task>,
    Month: ReadonlyArray<Task>,
    Year: ReadonlyArray<Task>,
  }
};

export const initialState: HabitsState = {
  date: '',
  tasks: {
    Days: [],
    Month: [],
    Year: [],
  },
};

export type LoadTasksAction = {
  type: 'LOAD_TASKS';
  date: string,
  tasks: {
    Days: ReadonlyArray<Task>,
    Month: ReadonlyArray<Task>,
    Year?: ReadonlyArray<Task>,
  }
}

export type TaskEventAction = {
  type: 'TASK_EVENT';
} & TaskEvent

export type HabitsAction = LoadTasksAction | TaskEventAction;

export const habitsReducer = (state: HabitsState, action: HabitsAction): HabitsState => {
  switch (action.type) {
    case 'LOAD_TASKS': {
      const { Year, Month, Days } = action.tasks;

      if (Year !== undefined) {
        return {
          ...state,
          date: action.date,
          tasks: { Year, Month, Days }
        }
      }

      return {
        ...state,
        date: action.date,
        tasks: {
          ...state.tasks,
          Month, Days
        }
      };
    }

    case 'TASK_EVENT': {
      switch (action.taskEvents.__typename) {
        case 'AddTaskEvent': {
          return {
            ...state,
            tasks: {
              ...state.tasks,
              Days: state.tasks.Days.concat([action.taskEvents.newTask])
            }
          }
        }
      }
    }
  }
  return state;
}

export const habitsReducerLogged = (state: HabitsState, action: HabitsAction) => {
  console.log('previous', state);
  console.log('action', action);
  const newState = habitsReducer(state, action);
  console.log('next', newState);
  return newState;
}


