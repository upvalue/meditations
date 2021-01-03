import React from 'react';
import { Button, ButtonProps } from '../arche';

import { IconType } from 'react-icons';

export type IconButtonProps = {
  icon: IconType;
};

export const IconButton = (props: IconButtonProps & ButtonProps) => {
  const { icon: Icon, children, ...buttonProps } = props;
  return (
    <Button
      {...buttonProps}
      className="a-flex a-items-center"
    >
      <Icon className="a-mr1" />
      <div>

        {children}
      </div>
    </Button>
  );
}