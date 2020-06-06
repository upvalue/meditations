
import React from 'react';
import { RenderElementProps } from 'slate-react';
import { TElement } from '../store/types';

export const RenderElement = (args: RenderElementProps) => {
  const { attributes, children } = args;
  const element: any = args.element;

  switch (element.type) {
    case 'heading':
      return <h1 {...attributes}>{children}</h1>
    case 'line':
      return <div {...attributes}>{children}</div>
    default:
      return <div>this should never happen</div>
  }
}