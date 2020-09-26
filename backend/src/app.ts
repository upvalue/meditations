

import express from 'express';
// import Knex from 'knex';
import morgan from 'morgan';

import knex, { config } from './knex';

const app = express();

app.use(morgan('combined'));

app.get('/healthcheck/database', (req, res) => {
  knex.raw(`SELECT 'hello world';`).then(hello => res.json(hello.rows[0]['?column?']));
});

app.listen(process.env.PORT || 5000);