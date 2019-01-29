import { GraphQLClient } from 'graphql-request';

/**
 * graphql-request client instance
 */
export const client = new GraphQLClient(`/graphql`);

/**
 * Empty GQL tag to get VSCode IDE features
 */
export const gql = (strings: ReadonlyArray<string>) => {
  return strings.join('');
}
