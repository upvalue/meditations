// <reference path="types.d.ts" />

import express from 'express';
import morgan from 'morgan';
import { ApolloServer } from 'apollo-server-express';

import { typeDefs, resolvers } from './graphql';

const app = express();

app.use(morgan('combined'));

const server = new ApolloServer({
  typeDefs, resolvers
});

server.applyMiddleware({ app });


app.get('/healthcheck/database', (req, res) => {
  // knex.raw(`SELECT 'hello world';`).then(hello => res.json(hello.rows[0]['?column?']));
});

app.listen(process.env.PORT || 5000);