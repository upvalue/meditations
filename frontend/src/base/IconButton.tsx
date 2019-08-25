import React from 'react';
import { Button } from '@upvalueio/arche';
import { Link, LinkProps } from '@reach/router';
import { IconType } from 'react-icons';


export interface IconButtonProps {
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  // TODO type this
  icon: IconType;
  title?: string;
}

/**
 * Minimally styled button icon
 */
export const IconButton = (props: IconButtonProps) => {
  const Component = props.icon as any;
  return (
    <Button title={props.title} minimal={true} padding="p1" onClick={props.onClick}>
      <Component size="1.5em" />
    </Button>
  );
};

export interface IconLinkProps extends LinkProps<{}> {
  icon?: IconType;
  title?: string;
}

/**
 * A link styled as a minimal button
 * @param props 
 */
export const IconLink = (props: IconLinkProps) => {
  const Component = props.icon as any;
  return (
    <Link to={props.to} title={props.title} className="button minimal p1 IconLink">
      <Component size="1.5em" />
    </Link>
  );
}