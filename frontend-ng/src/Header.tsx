// Header.tsx - Header
import React from 'react';
import classNames from 'classnames';

import { MdBrightness3, MdBrightness4 } from 'react-icons/md';

import { View, useTheme, Button } from '@upvalueio/third-coast';
import { Link, LinkGetProps } from '@reach/router';

/**
 * Style active links
 */
const headerLinkProps = (props: LinkGetProps) =>
  ({ className: classNames('ml3', props.isCurrent && 'active') });

export interface HeaderIconButtonProps {
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  // TODO type this
  icon: any;
  title?: string;
}

/**
 * Minimally styled header icon
 */
export const HeaderIconButton = (props: HeaderIconButtonProps) => {
  const Component = props.icon;
  return (
    <Button title={props.title} minimal={true} padding="p1" onClick={props.onClick}>
      <Component size="1.5em" />
    </Button>
  );
}

/**
 * Page header. Displays navigation, title, global controls.
 */
export const Header = () => {
  const [theme, setTheme] = useTheme();

  return (
    <View
      component="header"
      className="dark"
      flex="items-center"
      style={{ height: '55px' }}
    >
      <View flex={['flex-auto']}>
        <View padding="px2" margin="ml2" flex="items-center">
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

      <View flex={[]} margin="mr2">
        <HeaderIconButton
          icon={theme === 'dark' ? MdBrightness4 : MdBrightness3}
          title="Toggle dark mode"
          onClick={() => { setTheme(theme === 'dark' ? undefined : 'dark'); }}
        />
      </View>
    </View>
  );
};
