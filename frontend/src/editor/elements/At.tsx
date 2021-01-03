import React from 'react';
import { useSelector } from 'react-redux';
import { RenderElementProps } from "slate-react";
import { Callout, Group } from '../../arche';
import { TAt } from '../../shared';
import { StoreState } from '../../store/store';


import { MdDone, MdClose, MdPanoramaFishEye, MdLens, MdGpsNotFixed, MdGpsOff, MdGpsFixed } from 'react-icons/md';

export const At = (props: RenderElementProps) => {
  const { atId } = props.element as TAt;
  const { attributes } = props;

  const atsByName = useSelector((state: StoreState) => state.ats.atsById);

  const at = atsByName[atId];

  if (!at) {
    return <div>
      unknown @
      {props.children}
    </div>
  }

  console.log(at);

  return <div contentEditable={false} {...attributes} className="at">
    <Callout className="a-items-center a-flex a-py1">
      <Group spacing={1} className="a-items-center">
        <div className="a-flex">
          <MdPanoramaFishEye />
        </div>
        <a href="https://example.com">{at.atName}</a>
        <div>
          {at.atType}
        </div>
      </Group>
      {props.children}
    </Callout>
  </div>

}