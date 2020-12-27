import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import { Provider as ReduxProvider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';

import { store } from './store/store';
import './arche.css';
import './index.css';

import { createClient, dedupExchange, fetchExchange, Provider as UrqlProvider } from 'urql';

const urqlClient = createClient({
  // TODO: Make this build-time configurable
  url: 'http://localhost:5000/graphql',
  requestPolicy: 'network-only',
  // Disable caching
  exchanges: [
    dedupExchange,
    fetchExchange,
  ]
})

ReactDOM.render(
  <ReduxProvider store={store} >
    <UrqlProvider value={urqlClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </UrqlProvider>
  </ReduxProvider >,
  document.getElementById('root')
);