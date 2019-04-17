import Knex = require('knex');

import glob = require('tiny-glob');

export const knex = Knex({
  client: 'sqlite3',
  connection: {
    filename: './development.sqlite3'
  },
  useNullAsDefault: true,
});


export const migrations = async () => {
  const migrationFiles = await glob('sql/*.sql');
  console.log(migrationFiles);
}

migrations();