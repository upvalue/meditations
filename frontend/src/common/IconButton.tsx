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
      className="a-flex a-items-center a-justify-center"
    >
      <Icon className={children ? "a-mr1" : ""} />
      {children &&
        <div>
          {children}
        </div>
      }
    </Button>
  );
}