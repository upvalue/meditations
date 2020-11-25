import React from 'react';
import * as Urql from 'urql';

/**
 * Passed by load. Signature of a function to reload an urql query.
 */
export type ReloadFunction = (opts?: Partial<Urql.OperationContext> | undefined) => void;

export type LoadProps<Query, QueryVariables> = {
  options?: Omit<Urql.UseQueryArgs<QueryVariables>, 'query'>;
  hook: (options?: Omit<Urql.UseQueryArgs<QueryVariables>, 'query'>) => Urql.UseQueryResponse<Query, object>;
  render: React.FC<{ data: Query, reload: ReloadFunction }>;
  // const reload: (opts?: Partial<Urql.OperationContext> | undefined) => void

}

/**
 * Load an urql query with support for content states
 */
export const Load = <Query extends {}, QueryVariables>(props: LoadProps<Query, QueryVariables>) => {
  const { hook, options } = props;

  const [result, reload] = hook(options);

  const { data, fetching, error } = result;

  if (fetching) {
    return <div>Fetching</div>
  }

  if (error) {
    console.log(error);
    return <div>error {JSON.stringify(error)}</div>
  }

  // Should not happen, but need to assert non-nullability 
  if (!data) {
    return <div>Unexpected state</div>
  }

  return props.render({ data, reload });
};