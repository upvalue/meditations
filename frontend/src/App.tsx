import React from 'react';

import { Sidebar } from './navigation/Sidebar';
import { Switch, Route } from 'react-router';
import { DocumentRoute } from './routes/DocumentRoute';

const App = () => {
  return (
    <div className="App flex justify-center pt3">
      <div className="flex">
        <Sidebar />

        <Switch>
          <Route path={"/document/:documentId"}>
            <DocumentRoute />
          </Route>
        </Switch>

      </div>
    </div>
  );
}

export default App;
