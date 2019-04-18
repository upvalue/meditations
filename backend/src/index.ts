import server from './graphql';

server.listen().then((thing: any) => {
  const { url } = thing;
  console.log(`Server ready at ${url}`);
});