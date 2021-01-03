import React, { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Transforms } from 'slate';
import { ReactEditor, RenderElementProps, useEditor } from 'slate-react';
import { AtType, useAtTypeSelectMutation } from '../../api/client';
import { Button, Callout, Group } from '../../arche';
import { TAtTypeSelect, TNode } from '../../shared';
import { atSlice, StoreState } from '../../store/store';

/**
 * Allows user to select a type for a new at within the document
 */
export const AtTypeSelect = (props: RenderElementProps) => {
  const elt = props.element as TAtTypeSelect;
  const { attributes } = props;

  /*
    const focused = useFocused();
    const selected = useSelected();
  */
  console.log(props);

  const dispatch = useDispatch();
  const [, atTypeSelectMutation] = useAtTypeSelectMutation();

  const atsById = useSelector((state: StoreState) => state.ats.atsById);

  const at = atsById[elt.atId];

  const editor = useEditor();

  const setType = useCallback((tipe: AtType) => {
    return () => {
      atTypeSelectMutation({
        atId: elt.atId,
        atType: tipe,
      }).then(res => {
        // Replace this with an at that has a defined type
        const path = ReactEditor.findPath(editor, props.element);
        const entry: TNode = {
          type: 'at',
          atId: elt.atId,
          children: [{ text: '' }],
        };

        Transforms.setNodes(editor, entry, { at: path });

        const newData = res.data?.atTypeSelect;

        if (newData) {
          dispatch(atSlice.actions.upsertAt(newData));
        }
      })
    }
  }, [atTypeSelectMutation, editor]);

  return <div contentEditable={false} {...attributes}>
    {props.children}
    <Callout>
      <div>
        <Group spacing={1}>
          <div className="mr4">@{at.atName}</div>

          <Button onClick={setType(AtType.Yesno)}>
            Yes/No
            </Button>
          <Button onClick={setType(AtType.Timer)}>
            Timer
            </Button>
          <Button onClick={setType(AtType.YesnoTimer)}>
            Yes/No With Timer
            </Button>
        </Group>
      </div>
    </Callout>
  </div>
}
