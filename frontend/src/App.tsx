/// <reference path="../node_modules/@types/reach__router/index.d.ts" />
import React, { Component } from 'react';
import classNames from 'classnames';

import { Router, Redirect } from '@reach/router';

import 'normalize.css/normalize.css';
import { SocketProvider } from './hooks/useSubscription';
import { HabitsContainer } from './habits/HabitsContainer';
import { format } from 'date-fns';

const currentDate = format(new Date(), 'yyyy-MM');

class App extends Component {
  render() {
    return (
      <SocketProvider>
        <Router className="ThemedBody flex" primary={false}>
          <HabitsContainer
            path="habits/browse/:date"
          />

          <Redirect
            noThrow={true}
            from="/"
            to={`/habits/browse/${currentDate}`}

          />
        </Router>
      </SocketProvider>
    );
  }
}

export default App;
