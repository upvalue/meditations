import { Task, AddTaskEvent, TaskPositionEvent, baseDate } from "../api";
import { isValid, parse } from "date-fns";
import partition from 'lodash/partition';
import { format } from "date-fns";


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
} & (AddTaskEvent | TaskPositionEvent);

export type HabitsAction = LoadTasksAction | TaskEventAction;

export type ScopeMountedResult = 'Month' | 'Year' | 'Days' | false;

/**
 * Determines whether a task is mounted within the currently active view based on date,
 * and if so, where
 * @param currentDate 
 * @param date 
 */
const scopeMounted = (currentDate: string, date: string): ScopeMountedResult => {
  const currentDateObj = parse(currentDate, 'yyyy-MM', baseDate);
  // If year
  const yearCheck = parse(date, 'yyyy', baseDate);
  const monthCheck = parse(date, 'yyyy-MM', baseDate);
  const dayCheck = parse(date, 'yyyy-MM-dd', baseDate);
  if (isValid(yearCheck)) {
    console.log('within year');
    return format(currentDateObj, 'yyyy') === date && 'Year';
  } else if (isValid(dayCheck)) {
    console.log('within days');
    return currentDate === format(dayCheck, 'yyyy-MM') && 'Days';
  } else if (isValid(monthCheck)) {
    // Must come after days check
    console.log('within month');
    return format(currentDateObj, 'yyyy-MM') === date && 'Month';
  }
  return false;
}
// scopeMounted (currentDate, date) => 
// if its year, year equal
// if its month, month equal
// if its day, month equal


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
      console.log(action.__typename);
      switch (action.__typename) {
        case 'TaskPositionEvent': {
          const { taskPosition } = action;
          const { id, task, oldPosition, newPosition, oldDate, newDate } = taskPosition;
          // First we need to determine whether this event is relevant to us at all.

          // It is relevant to us if the current page contains either the old or new date

          // If it is relevant to us, we need to (1) remove task from old thing if irrelevant
          // (2) add task to new thing if relevant
          const oldMounted = scopeMounted(state.date, oldDate);

          const newMounted = scopeMounted(state.date, newDate);

          let newState = state;

          console.log('removing from ', oldMounted);

          // Remove from old scope
          if (oldMounted) {
            newState = {
              ...state,
              tasks: {
                ...state.tasks,
                [oldMounted]: state.tasks[oldMounted].filter(t => t.id !== id),
              }
            }
          }

          // Add to new scope
          console.log('new task', task);
          if (newMounted) {
            let [newScope, otherTasks] = partition(newState.tasks[newMounted], t => t.date === task.date);

            console.log(newScope.length, newScope);
            let newScopeMut = newScope.slice();
            newScopeMut.splice(task.position, 0, task);

            console.log(newScopeMut.length, newScopeMut);

            newScopeMut = newScopeMut.map((task, position) => ({ ...task, position }));

            newState = {
              ...newState,
              tasks: {
                ...newState.tasks,
                [newMounted]: [...newScopeMut, ...otherTasks],
              }
            }
          }

          return newState;
        }
        case 'AddTaskEvent': {
          return {
            ...state,
            tasks: {
              ...state.tasks,
              Days: [...(state.tasks.Days || []), action.newTask],
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


