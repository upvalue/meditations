import React, { Component } from 'react';
import { ThirdCoast, Button } from '@upvalueio/third-coast';
import '@upvalueio/third-coast/index.scss';

class App extends Component {
  render() {
    return (
      <ThirdCoast>

        <div className="App">
          <Button>Boop the Snoot</Button>
          <p>Hey how's it going</p>
        </div>
      </ThirdCoast>
    );
  }
}

export default App;
