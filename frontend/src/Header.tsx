// Header.tsx - Header
import React from 'react';

import classNames from 'classnames';
import { MdBrightness3, MdBrightness4 } from 'react-icons/md';
import { Link, LinkGetProps } from '@reach/router';
import { View } from '@upvalueio/arche';

import { IconButton } from './base/IconButton';

/**
 * Style active links
 */
const headerLinkProps = (props: LinkGetProps) => {
  return ({ className: classNames('ml3', props.isPartiallyCurrent && 'active') });
}

/**
 * Page header. Displays navigation, title, global controls.
 */
export const Header = () => {
  return (
    <View
      component="header"
      className="dark"
      flex={['flex', 'items-center']}
    >
      <View flex={['flex', 'flex-auto']}>
        <View padding="px2" margin="ml2" flex={['flex', 'items-center']}>
          <h1 className="m0" style={{ display: 'inline ' }}>meditations</h1>
          <nav>
            {/* TODO fix this link */}
            <Link to="/habits" getProps={headerLinkProps}>
              Habits
            </Link>
            <Link to="/notes" getProps={headerLinkProps}>
              Notes
            </Link>
            <Link to="/test" getProps={headerLinkProps}>
              Test
            </Link>
          </nav>
        </View>
      </View>

      {/*<View flex="flex" margin="mr2">
        <IconButton
          icon={theme === 'dark' ? MdBrightness4 : MdBrightness3}
          title="Toggle dark mode"
          onClick={() => { setTheme(theme === 'dark' ? undefined : 'dark'); }}
        />
  </View>*/}
    </View>
  );
};
