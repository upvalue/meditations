///<reference path="riot-route/index.d.ts" />

import * as React from 'react';
import { render }from 'react-dom';
//import route from 'riot-route';
import route from 'riot-route';

export class JournalRoot extends React.Component<{}, undefined> {
  render() {
    return <p>Hello world</p>
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // Install routing function
  route(function() {
    const action = [].shift.apply(arguments);
    console.log(`Dispatching ${action}`);
  });


  /*
  console.log("Wizard fight.");
  console.log(route);
  console.log(route.start);
  */
  route.base("/journal#");
  route.start(true);
  const query = route.query();
  //console.log(route.query());

  render(<JournalRoot />, document.getElementById('journal-root'));
  
});
