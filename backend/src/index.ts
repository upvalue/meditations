import express from 'express';
import { typeDefs, resolvers } from './graphql';
import { ApolloServer } from 'apollo-server-express';
import { createServer } from 'http';

// Set up server
const server = new ApolloServer({ typeDefs, resolvers });

const app = express();

server.applyMiddleware({ app });

const httpServer = createServer(app);

server.installSubscriptionHandlers(httpServer);

httpServer.listen(4000, () => {
  console.log('Server ready 4000');
});