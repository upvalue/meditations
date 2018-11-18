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

interface DefaultRouteProps {
  default: boolean;
}

const DefaultRoute = (props: DefaultRouteProps) => {
  return (
    <div className="App">
      <p>one two three four</p>
    </div>
  );
}

// Helper.tsx - Provide tooltips for users

// type HelperIndication

// const Helper = 
//   useHelper('Use this to record how much time you've put towards a particular habit.');

// const [nannyActive, advanceNanny] =
// const Nanny =
//   useNanny('HABITS', 'TOOLTIP');

// <Helper
// 
// />

// const HelperContext = React.createContext()
const Butan = () => {
  const [count, setCount] = useState(0);

  return <button onClick={() => setCount(count + 1)}>{count}</button>
}

const ThemedBody = () => {
  const [theme] = useTheme();

  return (
    <Router className="ThemedBody px3 py2">
      <HabitsPage
        default={true}
      />
      <NotesPage
        path="/notes"
      />
    </Router>
  );
}

// useEffect(async () => {

// }, [])

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
