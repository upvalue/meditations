/// <reference path="../node_modules/@types/reach__router/index.d.ts" />
import React, { Component } from 'react';
import classNames from 'classnames';

import { Router, Redirect } from '@reach/router';

import { ThirdCoast } from '@upvalueio/third-coast';

import { ThemeName } from '@upvalueio/third-coast/dist/Theme';

import 'normalize.css/normalize.css';
import { SocketProvider } from './hooks/useSubscription';
import { HabitsContainer } from './habits/HabitsContainer';
import { formatDate } from './api';
import { format } from 'date-fns';

const currentDate = format(new Date, 'yyyy-MM');

const ThemedBody = () => {
  return (
    <Router className="ThemedBody flex" primary={false}>
      <HabitsContainer
        path="habits/browse/:date"
      />

      {/*<NotesPage
        path="/notes"
      />*/}

      <Redirect
        noThrow={true}
        from="/"
        to={`/habits/browse/${currentDate}`}

      />
    </Router>
  );
}

export type ButtonProps = React.HTMLProps<HTMLButtonElement> & {};

class App extends Component {
  /**
   * Set theme on root component in order
   * to avoid unnecessary wrappers.
   */
  toggleTheme = (theme: ThemeName) => {
    const root = document.getElementById('root');
    if (root) {
      root.setAttribute('class', classNames(theme));
    }
  }

  render() {
    return (
      <ThirdCoast
        onThemeChange={this.toggleTheme}
      >
        <SocketProvider>
          <ThemedBody />
        </SocketProvider>
      </ThirdCoast>
    );
  }
}

export default App;
