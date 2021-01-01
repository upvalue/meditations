import React from 'react';
import { useSelector } from 'react-redux';
import { RenderElementProps, useFocused, useSelected } from 'slate-react';
import { Button, Callout, Group, joinClassNames } from '../../arche';
import { TAtTypeSelect, TTag } from '../../shared';
import { StoreState } from '../../store/store';

export const AtTypeSelect = (props: RenderElementProps) => {
  const elt = props.element as any as TAtTypeSelect;
  const { attributes } = props;

  // OK - So now we need to allow the user to select things. We can then replace the node at this
  // path with an actual at node, which will (something)

  /*const focused = useFocused();
  const selected = useSelected(); */

  const atsById = useSelector((state: StoreState) => state.ats.atsById);

  const at = atsById[elt.atId];

  return <>
    <div contentEditable={false} {...attributes}>
      {props.children}
      <Callout>
        <div>
          <Group spacing={1}>
            <div className="mr4">@{at.atName}</div>

            <Button onClick={() => console.log('hi')}>
              Yes/No
            </Button>
            <Button onClick={() => console.log('hi')}>
              Timer
            </Button>
            <Button onClick={() => console.log('hi')}>
              Yes/No With Timer
            </Button>
          </Group>
        </div>
      </Callout>
    </div>
  </>
}
