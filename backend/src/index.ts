import { httpServer } from './graphql';

/*
app.listen().then((thing: any) => {
  const { url } = thing;
  console.log(`Server ready at ${url}`);
});
*/

httpServer.listen(4000, () => {
  console.log('Server ready');
});