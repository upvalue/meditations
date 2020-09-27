// <reference path="types.d.ts" />

import express from 'express';
// import Knex from 'knex';
import morgan from 'morgan';
import { ApolloServer, gql } from 'apollo-server-express';

import knex, { config } from './knex';
import { typeDefs, resolvers } from './graphql';

const app = express();

app.use(morgan('combined'));

const { user, host, password, database } = config.connection;

const server = new ApolloServer({
  typeDefs, resolvers
});

server.applyMiddleware({ app });


app.get('/healthcheck/database', (req, res) => {
  knex.raw(`SELECT 'hello world';`).then(hello => res.json(hello.rows[0]['?column?']));
});

app.listen(process.env.PORT || 5000);