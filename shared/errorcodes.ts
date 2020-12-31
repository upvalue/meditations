// Stable error codes

/**
 * Error while parsing document
 */
export const SERVER_DOCUMENT_PARSE_ERROR = 'server/document-parse';

/**
 * Revision invariant broken (something went wrong with autosave)
 */
export const SERVER_REVISION_INVARIANT_BROKEN_ERROR = 'server/revision-invariant-broken';

/**
 * Database error
 */
export const SERVER_DATABASE_ERROR = 'server/database';

export type ErrorCode =
  | typeof SERVER_DOCUMENT_PARSE_ERROR
  | typeof SERVER_REVISION_INVARIANT_BROKEN_ERROR
  | typeof SERVER_DATABASE_ERROR
  ;