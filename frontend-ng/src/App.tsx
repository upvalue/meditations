import React, { Component } from 'react';
import { Provider } from 'react-redux';

/// <reference path="../node_modules/@types/reach__router/index.d.ts" />
import { Router } from '@reach/router';

import { ThirdCoast, Button } from '@upvalueio/third-coast';
import '@upvalueio/third-coast/index.scss';

import { store } from './store';
import { Header } from './Header';
import './styles/main.scss';

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

class App extends Component {
  render() {
    return (
      <ThirdCoast>
        <Provider store={store}>
          <React.Fragment>
            <Header />
            <Router>
              <DefaultRoute default={true} />
            </Router>
          </React.Fragment>
        </Provider>
      </ThirdCoast>
    );
  }
}

export default App;
