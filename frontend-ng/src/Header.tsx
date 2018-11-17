// Header.tsx - Header
import React, { useContext } from 'react';

import { View, useTheme, Button } from '@upvalueio/third-coast';
import { useHelper, HelperContext } from './Helper';

const HelperButton = () => {
  const data = useContext(HelperContext);

  return (
    <Button onClick={() => data.setHelperActive(true)}>
      Help me
    </Button>
  );
}

/**
 * Page header. Displays navigation, title, help message, nanny.
 */
export const Header = () => {
  const [theme, setTheme] = useTheme();

  return (
    <React.Fragment>
      <View
        component="header"
        flex="items-center"
        style={{ height: '55px' }}
      >
        <View flex={['items-center', 'flex-auto']}>
          <View padding="px2" flex="items-center">
            <h1 className="m0" style={{ display: 'inline ' }}>meditations</h1>
            <div style={{ alignItems: 'end' }}>
              <strong className="ml4" style={{ borderBottom: '1px dotted #ffffff' }}>Habits</strong>
              <span className="ml4">Notes</span>
            </div>
          </View>

        </View>

        <View flex={[]} margin="mr2">
          <HelperButton />
          <Button className="dark" onClick={() => setTheme(theme === 'dark' ? '' : 'dark')}>Dark</Button>

        </View>
      </View >
      {/*<div style={{ height: '55px', marginTop: '-55px', display: 'flex' }}>
        <div className="Header-nav flex justify-around items-center" style={{ margin: '0 auto', width: '26em' }}>
          <h2 className="m0">July 2018</h2>
        </div>
  </div>*/}
    </React.Fragment >
  );
};
