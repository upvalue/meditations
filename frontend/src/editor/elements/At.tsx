import React, { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { ReactEditor, RenderElementProps, useEditor, useFocused, useSelected } from "slate-react";
import { Callout, Group, joinClassNames } from '../../arche';
import { TAt, TNode } from '../../shared';
import { StoreState } from '../../store/store';


import { MdDone, MdClose, MdPanoramaFishEye, MdLens, MdGpsNotFixed, MdGpsOff, MdGpsFixed } from 'react-icons/md';
import { IconButton } from '../../common/IconButton';
import { IconType } from 'react-icons';
import { Transforms } from 'slate';

export const At = (props: RenderElementProps) => {
  const element = props.element as TAt;
  const { atId, status } = element;
  const { attributes } = props;

  const atsByName = useSelector((state: StoreState) => state.ats.atsById);

  const focused = useFocused();
  const selected = useSelected();
  const editor = useEditor();

  const at = atsByName[atId];

  const cycleStatus = useCallback(() => {
    const path = ReactEditor.findPath(editor, props.element)
    let nextStatus: 'complete' | 'unset' | 'incomplete' = 'complete';
    if (status === 'incomplete') {
      nextStatus = 'unset';
    } else if (status === 'complete') {
      nextStatus = 'incomplete';
    }
    const entry: TNode = {
      ...element,
      status: nextStatus,
    };

    Transforms.setNodes(editor, entry, { at: path });
  }, [status]);

  if (!at) {
    return <div>
      unknown @
      {props.children}
    </div>
  }

  let icon: IconType = MdPanoramaFishEye;

  if (status === 'complete') {
    icon = MdDone;
  } else if (status === 'incomplete') {
    icon = MdClose;
  }

  return <div contentEditable={false} {...attributes} className="t-at">
    <Callout className={joinClassNames("a-items-center a-flex a-py1", focused && selected && "outline")}>
      <Group spacing={1} className="a-items-center">
        <div className="a-flex">
          <IconButton icon={icon} onClick={cycleStatus} minimal />
        </div>
        <a href="https://example.com">{at.atName}</a>
      </Group>
      {props.children}
    </Callout>
  </div >

}