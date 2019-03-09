type Fragment = ReadonlyArray<string>;

type Variables = { [key: string]: any };

import { schema } from './mock';
import { graphql } from 'graphql';

export const request = <T extends any>(
  query: string,
  fragmentsOrVariables?: Fragment | Variables,
  variables?: Variables): Promise<T> => {
  let fragments: ReadonlyArray<string> | null = null;
  let vars: Variables | null = null;

  if (Array.isArray(fragmentsOrVariables)) {
    fragments = fragmentsOrVariables;
    if (variables) {
      vars = variables;
    }
  } else if (fragmentsOrVariables) {
    vars = fragmentsOrVariables;
  }

  const queryString = `
${fragments ? fragments.join('\n') : ''}
${query}`.trim();


  return graphql(schema, queryString, null, null, vars) as Promise<T>;

  // Uncomment for mocks

  fetch(`/api/graphql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      query,
      variables: vars ? vars : undefined
    })
  });
}