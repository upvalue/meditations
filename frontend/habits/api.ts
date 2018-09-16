// api.ts - Habits API

import * as common from '../common';
import { Task, Comment, Project } from './state';

// This little dance is necessary to make all fields of comment optional
type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

type PartialTaskWithPartialComment =
  Pick<Task, 'ID'> & {Comment?: Partial<Comment>} & Partial<Omit<Task, 'Comment'>>;

/**
 * Update a task by ID
 *
 * If `Comment` is set, will create a comment (if one doesn't exist),
 * update a comment (if one does exist), or delete a comment (if Comment.Body is empty)
 *
 * @param task Task (ID is mandatory, other fields optional)
 */
export const TaskUpdate = (task: PartialTaskWithPartialComment) => {
  return common.put(`/habits/tasks/${task.ID}`, task);
};

/**
 * Create a new task
 * @param task (Name is mandatory, other fields optional)
 */
export const TaskNew = (task: Pick<Task, 'Name'> & Partial<Task>) => {
  return common.post(`/habits/tasks`, task);
};

/**
 * Delete a task by ID
 * @param task (ID is mandatory)
 */
export const TaskDelete = (task: Pick<Task, 'ID'>) => {
  return common.delete_(`/habits/tasks/${task.ID}`);
};

export const ProjectNew = (project: Pick<Project, 'Name'>) => {
  return common.post(`/habits/projects`, project);
};

export const ProjectUpdate = (project: Pick<Project, 'ID'> & Partial<Project>) => {
  return common.put(`/habits/projects/${project.ID}`, project);
};

export const ProjectDelete = (project: Pick<Project, 'ID'>) => {
  return common.delete_(`/habits/projects/${project.ID}`);
};
