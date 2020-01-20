import React from 'react';
import { Page } from './editor/Editor';

const App = () => {
  return (
    <div className="App flex justify-center pt3">
      <div className="flex">
        <div className="mr2">
          <button>
            reset
          </button>
        </div>
        <Page />
      </div>
    </div>
  );
}

export default App;
