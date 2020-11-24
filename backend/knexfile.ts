export default {
  development: {
    client: 'postgresql',
    connection: {
      host: 'localhost',
      database: 'techne',
      user: 'postgres',
      password: 'postgres',
    },
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      tableName: 'knex_migrations'
    },
    searchPath: ['techne', 'public'],
  },
  production: {
    client: 'postgresql',
    connection: {
      host: process.env.DB_ADDRESS,
      database: `${process.env.APP_CLUSTER}_techne`,
      user: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
    },
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      tableName: 'knex_migrations'
    },
    searchPath: ['techne', 'public'],
  },
};
