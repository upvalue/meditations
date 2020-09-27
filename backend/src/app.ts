// <reference path="types.d.ts" />

import express from 'express';
// import Knex from 'knex';
import morgan from 'morgan';
import ConnectionPluginFilter from 'postgraphile-plugin-connection-filter';
import postgraphile from 'postgraphile';

import knex, { config } from './knex';

const app = express();

app.use(morgan('combined'));

const { user, host, password, database } = config.connection;

app.use(
  postgraphile(
    `postgres://${user}:${password}@${host}/${database}`,
    ['public'],
    {
      appendPlugins: [ConnectionPluginFilter],
      watchPg: true,
      graphiql: true,
      graphiqlRoute: `/api/graphiql`,
      graphqlRoute: `/api/graphql`,
    }
  )
)


app.get('/healthcheck/database', (req, res) => {
  knex.raw(`SELECT 'hello world';`).then(hello => res.json(hello.rows[0]['?column?']));
});

app.listen(process.env.PORT || 5000);