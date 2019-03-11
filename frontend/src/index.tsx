import './styles/main.scss';
import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import * as serviceWorker from './serviceWorker';

// Remove loading animation defined in index.html
const loader = document.getElementById('loader');
window.clearInterval((window as any).$mli);
if (loader) loader.remove();

ReactDOM.render(<App />, document.getElementById('root'));

serviceWorker.unregister();
