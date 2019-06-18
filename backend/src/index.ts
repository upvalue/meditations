import express from 'express';
import { typeDefs, resolvers } from './graphql';
import { ApolloServer } from 'apollo-server-express';
import { createServer } from 'http';

// Set up server
const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: ({ req }) => {
    if (!req) return { sessionId: 'unknown' };
    const { authorization } = req.headers;
    if (authorization) {
      const bits = authorization.split(' ');
      if (bits.length > 1) {
        const sessionId = bits[1];

        return { sessionId };
      }
    }

    return { sessionId: 'unknown' };
  },
});

const app = express();

server.applyMiddleware({ app });

const httpServer = createServer(app);

server.installSubscriptionHandlers(httpServer);

httpServer.listen(4000, () => {
  console.log('Server ready 4000');
});