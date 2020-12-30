import React from 'react';
import { useSelector } from 'react-redux';
import { RenderElementProps } from 'slate-react';
import { TTag } from '../../shared';
import { TState } from '../../store/store';

export const Tag = (props: RenderElementProps) => {
  const elt = props.element as any as TTag;
  const { attributes } = props;

  const tagsById = useSelector((state: TState) => state.tags.tagsById);

  const tagName = tagsById[elt.tagId]?.tagName || elt.tagId;

  return <span {...attributes} style={{ color: 'blue' }}>
    #{tagName}{props.children}
  </span>
}