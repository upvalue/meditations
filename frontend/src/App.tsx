import React from 'react';

import { Sidebar } from './navigation/Sidebar';
import { Switch, Route } from 'react-router';
import { DocumentRoute } from './routes/DocumentRoute';

const App = () => {
  return (
    <div className="App a-flex a-justify-center">
      <div className="a-flex">
        <Sidebar />

        <Switch>
          <Route path={"/document/:documentId"}>
            <DocumentRoute />
          </Route>
          <Route path="/collections/:collectionName">
            <p>hiya</p>
          </Route>
        </Switch>

      </div>
    </div>
  );
}

export default App;
