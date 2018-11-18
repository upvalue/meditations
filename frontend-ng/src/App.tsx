/// <reference path="../node_modules/@types/reach__router/index.d.ts" />
import React, { Component, useState } from 'react';
import { Provider } from 'react-redux';
import classNames from 'classnames';

import { Router } from '@reach/router';

import { ThirdCoast, Button, useTheme } from '@upvalueio/third-coast';

import { store } from './store';
import { Header } from './Header';
import { ThemeName } from '@upvalueio/third-coast/dist/Theme';
import { NotesPage } from './notes/NotesPage';
import { HabitsPage } from './habits/HabitsPage';

const ThemedBody = () => {
  return (
    <Router className="ThemedBody flex ">
      <HabitsPage
        default={true}
      />
      <NotesPage
        path="/notes"
      />
    </Router>
  );
}

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
        <Provider store={store}>
          <>
            <Header />
            <ThemedBody />
          </>
        </Provider>
      </ThirdCoast>
    );
  }
}

export default App;
