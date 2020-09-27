import knex from 'knex';

import connection from '../knexfile';

export const config = process.env.NODE_ENV === 'production' ? connection.production : connection.development;

export default knex(config).withSchema('techne');