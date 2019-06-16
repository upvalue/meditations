import uuid from 'uuid';

/**
 * A unique session ID for each client session
 */
export const SESSION_ID = uuid();

type Fragment = ReadonlyArray<string>;

type Variables = { [key: string]: any };

export class GQLError extends Error {
  response: any;
  errors: any;

  constructor(res: any, errors: any) {
    super(errors.map((e: any) => e.message).join("\n"));
    this.response = res;
    this.name = "GQLError";
  }
}

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

  return fetch(`/graphql`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SESSION_ID}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      query: queryString,
      variables: vars ? { ...vars, sessionId: SESSION_ID } : undefined
    })
  })
    .then((res: any) => res.json())
    .then((res: any) => {
      if (res.errors) {
        throw new GQLError(res, res.errors);
      } else if (res.data) {
        return res.data;
      }
      if (res.data) return res.data;
      console.error(res);

    }) as Promise<T>;
}