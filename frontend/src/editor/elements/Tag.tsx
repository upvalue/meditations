import React from 'react';
import { RenderElementProps } from 'slate-react';
import { TTag } from '../../shared';

export const Tag = (props: RenderElementProps) => {
  const elt = props.element as any as TTag;
  const { attributes, element } = props;

  return <span {...attributes} style={{ color: 'blue' }}>
    #{props.children}
  </span>
}