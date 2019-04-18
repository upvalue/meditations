import Knex = require('knex');

export const knex = Knex({
  client: 'sqlite3',
  connection: {
    filename: process.env.MEDITATIONS_DB || './development.sqlite3',
  },
  useNullAsDefault: true,
});
