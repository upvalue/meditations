/// <reference path="../node_modules/@types/reach__router/index.d.ts" />
import React, { Component, useState } from 'react';
import { Provider } from 'react-redux';
import classNames from 'classnames';

import { Router } from '@reach/router';

import { ThirdCoast, Button, useTheme } from '@upvalueio/third-coast';

import { store } from './store';
import { Header } from './Header';
import { HelperProvider, useHelper } from './Helper';

interface DefaultRouteProps {
  default: boolean;
}

const HelpableText = () => {
  const Helper = useHelper(`
    You have been officially Helped.  
  `);

  return (
    <Helper>
      <p>This text can be helped on</p>
    </Helper>
  );
}

const DefaultRoute = (props: DefaultRouteProps) => {
  return (
    <div className="App">
      <p>one two three four</p>
      <HelpableText />
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
    <Router className={classNames('ThemedBody', theme)}>
      <DefaultRoute default={true} />
    </Router>
  );
}

// useEffect(async () => {

// }, [])

class App extends Component {
  render() {
    return (
      <ThirdCoast>
        <HelperProvider>
          <Provider store={store}>
            <React.Fragment>
              <Header />
              <ThemedBody />
            </React.Fragment>
          </Provider>
        </HelperProvider>
      </ThirdCoast>
    );
  }
}

export default App;
