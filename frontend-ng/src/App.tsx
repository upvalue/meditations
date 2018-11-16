import React, { Component } from 'react';
import { Provider } from 'react-redux';

/// <reference path="../node_modules/@types/reach__router/index.d.ts" />
import { Router } from '@reach/router';

import { ThirdCoast, Button } from '@upvalueio/third-coast';
import '@upvalueio/third-coast/index.scss';

import { store } from './store';

interface DefaultRouteProps {
  default: boolean;
}

const DefaultRoute = (props: DefaultRouteProps) => {
  return (
    <div className="App">
      <Button>Boop the snoot</Button>
      <p>howdy</p>
    </div>
  );
}

class App extends Component {
  render() {
    return (
      <ThirdCoast>
        <Provider store={store}>
          <Router>
            <DefaultRoute default={true} />
          </Router>
        </Provider>
      </ThirdCoast>
    );
  }
}

export default App;
