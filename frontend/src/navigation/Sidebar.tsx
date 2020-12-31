import React, { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Button, Callout, Group } from '../arche';
import { formatWireDate, NoteRecord } from '../shared';
import { useCreateNoteMutation } from '../api/client';
import { generateId } from '../lib/utilities';
import { ReloadFunction } from '../common/Load'
import { StoreState } from '../store/store';
import { useSelector } from 'react-redux';

export type SidebarProps = {
  notes: NoteRecord[];
  reload: ReloadFunction;
}

export const Sidebar = (props: SidebarProps) => {
  const { notes, reload } = props;

  const [, createNoteMutation] = useCreateNoteMutation();

  const createNote = useCallback(() => {
    const noteId = generateId('note');
    const createdAt = formatWireDate(new Date());

    createNoteMutation({ noteId, createdAt }).then(result => {
      reload();
    });
  }, [createNoteMutation]);

  const errors = useSelector((state: StoreState) => state.errors.errors);

  return (
    <div className="sidebar">
      <div className="a-p4">
        <div style={{ lineHeight: '32px' }}>
          <h4>Notes</h4>
          {notes.map(d => {
            return <div key={d.noteId}><Link to={`/note-remount/${d.noteId}`}>{d.noteId}</Link></div>
          })}

          {<Button onClick={createNote}>+ New document</Button>}
        </div>

      </div>
      {errors.length > 0 &&
        <Group direction="column" className="a-px4" spacing={2}>
          {errors.map((e, idx) => (
            <div key={idx}>
              <Callout intent="danger">
                {e.message}
              </Callout>
            </div>
          ))}

        </Group>
      }
    </div>
  );
}