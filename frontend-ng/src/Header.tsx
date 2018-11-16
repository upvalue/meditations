// Header.tsx - Header
import React from 'react';

import { View, useTheme, Button } from '@upvalueio/third-coast';

/**
 * Page header. Displays navigation, title, help message, nanny.
 */
export const Header = () => {
  const [theme, setTheme] = useTheme();

  return (
    <React.Fragment>
      <View
        component="header"
        padding={['px2']}
        style={{ display: 'flex', flexDirection: 'row', height: '55px', alignItems: 'center' }}
      >
        <div className="flex items-center">
          <h1 className="m0" style={{ display: 'inline' }}>meditations</h1>
          <div style={{ alignItems: 'end' }}>
            <strong className="ml4">Habits</strong>
            <span className="ml4">Notes</span>
          </div>
        </div>
        <div style={{ flex: '1 1 auto' }}>
        </div>
        <div>
          <Button onClick={() => setTheme(theme === 'dark' ? '' : 'dark')}>Dark</Button>
        </div>
      </View >
      <div style={{ height: '55px', marginTop: '-55px', display: 'flex' }}>
        <div className="Header-nav flex justify-around items-center" style={{ margin: '0 auto', width: '26em' }}>
          <h2 className="m0">July 2018</h2>
        </div>
      </div>
    </React.Fragment>
  );
}