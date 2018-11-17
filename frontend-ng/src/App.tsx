/// <reference path="../node_modules/@types/reach__router/index.d.ts" />
import React, { Component, useState } from 'react';
import { Provider } from 'react-redux';

import { Router } from '@reach/router';

import { ThirdCoast, Button } from '@upvalueio/third-coast';

import { store } from './store';
import { Header } from './Header';

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

const Butan = () => {
  const [count, setCount] = useState(0);

  return <button onClick={() => setCount(count + 1)}>{count}</button>
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
