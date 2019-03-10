import './styles/main.scss';
import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import * as serviceWorker from './serviceWorker';

require('react-dom');
window.React2 = require('react');
console.log('not running multiple copies of react', window.React1 === window.React2);
// Remove loading animation defined in index.html
const loader = document.getElementById('loader');
window.clearInterval(window.$mli);
//window.clearInterval((window as any).$mli);
if (loader) loader.remove();

ReactDOM.render(<App />, document.getElementById('root'));

serviceWorker.unregister();
