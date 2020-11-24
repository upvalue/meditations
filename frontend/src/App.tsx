import React, { useEffect, useState } from 'react';

import { Sidebar } from './navigation/Sidebar';
import { Switch, Route } from 'react-router';
import { DocumentRoute } from './routes/DocumentRoute';
import { useGetAllNotesQuery } from './api/client';
import { Load } from './common/Load';


const App = () => {
  return (
    <div className="App a-flex a-justify-center">
      <div className="a-flex">
        <Load
          hook={useGetAllNotesQuery}
          render={({ data, reload }) => {
            return <Sidebar notes={data.allNotes} reload={reload} />
          }}
        />

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
