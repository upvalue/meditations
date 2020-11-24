import React, { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../arche';
import { formatWireDate, NoteRecord } from '../shared';
import { useCreateNoteMutation } from '../api/client';
import { generateId } from '../lib/utilities';
import { ReloadFunction } from '../common/Load'

export type SidebarProps = {
  notes: NoteRecord[];
  reload: ReloadFunction;
}

console.log(formatWireDate(new Date()));

export const Sidebar = (props: SidebarProps) => {
  const { notes, reload } = props;

  const [createNoteResult, createNoteMutation] = useCreateNoteMutation();

  const createNote = useCallback(() => {
    const noteId = generateId('note');
    const createdAt = formatWireDate(new Date());

    createNoteMutation({ noteId, createdAt }).then(result => {
      reload();
    });
  }, [createNoteMutation]);

  const [confirm, setConfirm] = useState(false);

  return (
    <div className="sidebar">
      <div className="a-p4">
        <div style={{ lineHeight: '32px' }}>
          <h4>Notes</h4>
          {notes.map(d => {
            return <div key={d.noteId}><Link to={`/document/${d.noteId}`}>{d.noteId}</Link></div>
          })}

          {<Button onClick={createNote}>+ New document</Button>}
        </div>

        <div className="a-mt4">
          <h4>Collections</h4>
          {/*Object.entries(collections).map(([k, collection]) => <div key={k}><Link to={`/collections/${k}`}>@{collection.name}</Link></div>)}*/}
        </div>

        <div className="a-mt4">
          {/*<Button onClick={() => {
            if (confirm) {
              saveState(initialState);
              window.location.reload();
            } else {
              setConfirm(true);
            }
          }}>
            {confirm && "Are you sure?"}
            {!confirm && "Delete state"}
        </Button>*/}
        </div>

      </div>
    </div>
  );
}