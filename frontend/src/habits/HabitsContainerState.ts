import { Task, AddTaskEvent, TaskPositionEvent, baseDate } from "../api";
import { isValid, parse } from "date-fns";
import partition from 'lodash/partition';
import { format } from "date-fns";
import produce, { Draft } from 'immer';

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
    return format(currentDateObj, 'yyyy') === date && 'Year';
  } else if (isValid(dayCheck)) {
    return currentDate === format(dayCheck, 'yyyy-MM') && 'Days';
  } else if (isValid(monthCheck)) {
    // Must come after days check
    return format(currentDateObj, 'yyyy-MM') === date && 'Month';
  }
  return false;
}

export const habitsReducer = (state: Draft<HabitsState>, action: HabitsAction): HabitsState => {
  switch (action.type) {
    case 'LOAD_TASKS': {
      // Use produce to strip readonly types
      const { Year, Month, Days } = produce(action.tasks, tasks => tasks);

      state.date = action.date;

      if (Year !== undefined) {
        state.tasks.Year = Year;
      }

      state.tasks.Month = Month;
      state.tasks.Days = Days;

      return state;
    }

    case 'TASK_EVENT': {
      console.log(action.__typename);
      switch (action.__typename) {
        case 'TaskPositionEvent': {
          const { taskPosition } = action;
          const { id, task, oldDate, newDate } = taskPosition;
          // First we need to determine whether this event is relevant to us at all.

          // It is relevant to us if the current page contains either the old or new date

          // If it is relevant to us, we need to (1) remove task from old thing if irrelevant
          // (2) add task to new thing if relevant
          const oldMounted = scopeMounted(state.date, oldDate);

          const newMounted = scopeMounted(state.date, newDate);

          if (oldMounted) {
            state.tasks[oldMounted] = state.tasks[oldMounted].filter(t => t.id !== id);
          }

          if (newMounted) {
            let [newScope, otherTasks] = partition(state.tasks[newMounted], t => t.date === task.date);

            newScope.splice(task.position, 0, task);

            state.tasks[newMounted] = [...newScope, ...otherTasks];
          }

          break;
        }

        case 'AddTaskEvent': {
          state.tasks.Days.push(action.newTask);
          break;
        }
      }
    }
  }
  return state;
}

export const habitsReducerLogged = (state: HabitsState, action: HabitsAction) => {
  console.log('previous', state);
  console.log('action', action);
  const newState = produce(state, draftState => habitsReducer(draftState, action));
  console.log('next', newState);
  return newState;
}