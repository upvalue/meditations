import React from 'react';
import { RenderElementProps } from 'slate-react';

export type CollectionEntryProps = {
  attributes: RenderElementProps['attributes'],
  children: React.ReactNode,
  data: {
    collection: string;
  },
}

export const CollectionEntry = (props: CollectionEntryProps) => {
  const { attributes, children, data } = props;
  return <div {...attributes}>COLLECTION {data.collection} {children}</div>
}