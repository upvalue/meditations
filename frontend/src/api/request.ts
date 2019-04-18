type Fragment = ReadonlyArray<string>;

type Variables = { [key: string]: any };

/**
 * Make a GraphQL request, optionally including some fragments
 * @param query 
 * @param fragmentsOrVariables 
 * @param variables 
 */
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

  return fetch(`/api/graphql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      queryString,
      variables: vars ? vars : undefined
    })
  }).then((res: any) => res.json()) as Promise<T>;
}