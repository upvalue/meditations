import React from 'react';
import { RenderElementProps } from 'slate-react';
import { TElement } from '../../../shared';
import { CollectionEntry } from './elements/CollectionEntry';

export const RenderElement = (args: RenderElementProps) => {
  const { attributes, children } = args;
  const element: any = args.element;

  switch (element.type) {
    case 'heading':
      return <h1 {...attributes}>{children}</h1>
    case 'line':
      return <div {...attributes}>{children}</div>
    case 'collectionEntry':
      return <CollectionEntry data={element.data} attributes={attributes} children={children} />
    default:
      return <div>this should never happen</div>
  }
}