import React from 'react';
import { RenderElementProps } from 'slate-react';
import { Callout } from '../../arche';

export type CollectionEntryProps = {
  attributes: RenderElementProps['attributes'],
  children: React.ReactNode,
  data: {
    collection: string;
  },
}

export const CollectionEntry = (props: CollectionEntryProps) => {
  const { attributes, children, data } = props;
  return <div {...attributes}>
    <Callout>
      <button>i got to this</button>
      COLLECTION {data.collection} {children}
    </Callout>
  </div>
}