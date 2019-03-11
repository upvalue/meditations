import model from './model';
import server from './graphql';

console.log(model);

// This `listen` method launches a web-server.  Existing apps
// can utilize middleware options, which we'll discuss later.
server.listen().then((thing: any) => {
  const { url } = thing;
  console.log(`🚀  Server ready at ${url} !`);
});