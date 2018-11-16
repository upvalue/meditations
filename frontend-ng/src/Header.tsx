// Header.tsx - Header
import React from 'react';

import './Header.scss';
import { View, useTheme, Button } from '@upvalueio/third-coast';

/**
 * Page header. Displays navigation, title, help message, nanny.
 */
export const Header = () => {
  const [theme, setTheme] = useTheme();

  return (
    <React.Fragment>
      {/*
      <View component="header" padding={['p1']} style={{ display: 'flex', flexDirection: 'row', width: '100%', height: '55px', alignItems: 'center' }}>
        <div>
          <h1 className="m0">meditations</h1>
        </div>
        <div style={{ justifySelf: 'center', flex: '1 1 auto' }}>
          <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-around' }}>
            <p>Habits: July 2018</p>
          </div>
        </div>
        <div>
          <Button onClick={() => setTheme(theme === 'dark' ? '' : 'dark')}>Dark</Button>
        </div>
      </View >
      <div style={{ height: '55px', marginTop: '-55px', display: 'flex' }}>
        <div style={{ margin: '0 auto', backgroundColor: 'white', width: '26em', display: 'flex', justifyContent: 'space-around' }}>
          <span>Habits: July 2018</span>
        </div>
      </div>
      */}
      <Button>hello</Button>
    </React.Fragment>
  );
}