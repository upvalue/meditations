import React from 'react';
import { RenderElementProps, useFocused, useSelected } from 'slate-react';
import { TNode } from '../../../shared';
import { Tag } from './elements/Tag';

export const RenderElement = (args: RenderElementProps) => {
  const { attributes, children } = args;
  const element: TNode = args.element as any;

  const selected = useSelected();
  const focused = useFocused();

  if (!('type' in element)) return <div>this should never happen</div>;

  switch (element.type) {
    case 'heading': {
      let elt = `h${element.level}`;
      return React.createElement(elt, attributes, children);
    }
    case 'line':
      return <div {...attributes}>{children}</div>
    case 'tag':
      return <Tag selected={selected} focused={focused} {...args} />
    default:
      return <div>this should never happen</div>
  }
}