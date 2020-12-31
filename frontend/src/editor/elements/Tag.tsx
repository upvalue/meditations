import React from 'react';
import { useSelector } from 'react-redux';
import { RenderElementProps } from 'slate-react';
import { joinClassNames } from '../../arche';
import { TTag } from '../../shared';
import { StoreState } from '../../store/store';

export const Tag = (props: RenderElementProps & { selected: boolean, focused: boolean }) => {
  const elt = props.element as any as TTag;
  const { attributes, focused, selected } = props;

  const tagsById = useSelector((state: StoreState) => state.tags.tagsById);

  const tagName = tagsById[elt.tagId]?.tagName || elt.tagId;

  console.log({ selected, focused });

  return <span className={joinClassNames('t-tag', selected && focused && 'outline')} {...attributes}>
    #{tagName}{props.children}
  </span>
}