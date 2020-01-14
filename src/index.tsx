// This shim is a hack as I remove hand-configured bundle splitting in order to easily use CSA

import { main as habitsMain } from './habits/main';
import { main as journalMain } from './journal/main';

import './style/index.scss';

document.addEventListener('DOMContentLoaded', () => {
  const { pathname } = window.location;
  if (pathname === '/habits') {
    habitsMain();
  } else if (pathname === '/journal') {
    journalMain();
  } else if (pathname === '/') {
    // eslint-disable-next-line
    location.href = '/habits';
  } else {
    console.error('path not found');
  }
});
