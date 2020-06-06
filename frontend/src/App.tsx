import React from 'react';

import { Sidebar } from './navigation/Sidebar';
import { Switch, Route } from 'react-router';
import { DocumentRoute } from './routes/DocumentRoute';


const App = () => {
  return (
    <div className="App a-flex a-justify-center a-pt3">
      <div className="a-flex">
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
