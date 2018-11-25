// Header.tsx - Header
import React from 'react';

import classNames from 'classnames';
import { MdBrightness3, MdBrightness4 } from 'react-icons/md';
import { View, useTheme, Button } from '@upvalueio/third-coast';
import { Link, LinkGetProps } from '@reach/router';

import { IconButton } from './components/IconButton';

/**
 * Style active links
 */
const headerLinkProps = (props: LinkGetProps) =>
  ({ className: classNames('ml3', props.isCurrent && 'active') });

/**
 * Page header. Displays navigation, title, global controls.
 */
export const Header = () => {
  const [theme, setTheme] = useTheme();

  return (
    <View
      component="header"
      className="dark"
      flex={['flex', 'items-center']}
      style={{ height: '55px' }}
    >
      <View flex={['flex', 'flex-auto']}>
        <View padding="px2" margin="ml2" flex={['flex', 'items-center']}>
          <h1 className="m0" style={{ display: 'inline ' }}>meditations</h1>
          <nav>
            <Link to="/" getProps={headerLinkProps}>
              Habits
            </Link>
            <Link to="/notes" getProps={headerLinkProps}>
              Notes
            </Link>
          </nav>
        </View>
      </View>

      <View flex="flex" margin="mr2">
        <IconButton
          icon={theme === 'dark' ? MdBrightness4 : MdBrightness3}
          title="Toggle dark mode"
          onClick={() => { setTheme(theme === 'dark' ? undefined : 'dark'); }}
        />
      </View>
    </View>
  );
};
