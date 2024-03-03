const process = require('process');

const PG_URI = process.env.PG_URI || 'postgres://postgres:postgres@localhost:5432/postgres';

const connection = {
  client: 'postgresql',
  connection: PG_URI,
  pool: { min: 2, max: 10 },
  migrations: {
    tableName: 'knex_migrations',
  },
};

/**
 * @type { Object.<string, import("knex").Knex.Config> }
 */
module.exports = {
  development: connection,
  production: connection,
};
