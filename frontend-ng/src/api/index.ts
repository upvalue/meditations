import { GraphQLClient } from 'graphql-request';

const client = new GraphQLClient('/graphql');

type RequestScopeEnum = 'MONTH' | 'DAY' | 'YEAR';

interface Task {
  Name: string;
}

interface TasksByDateRequest {
  tasksByDate: {
    Month: Partial<Task>;
  };
}

/**
 * Query tasks within a date scope (e.g. all tasks for a given month)
 * @param date Date. YYYY-MM-DD. 
 * @param scopes MONTH, YEAR, DAYS (query all days within month)
 */
const tasksByDate = (date: string, scopes: ReadonlyArray<RequestScopeEnum>) =>
  client.request(`{
    tasksByDate(date: "${date}", scopes: [${scopes.join(',')}]) {
      Month {
        ID, Name
      }
    }
  }`) as Promise<TasksByDateRequest>;

(window as any).tasksByDate = tasksByDate;

const doSth = () => console.log('api init');

export default ({
  tasksByDate,
  doSth
});
