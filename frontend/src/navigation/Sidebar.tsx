import React, { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Button, Callout, Group } from '../arche';
import { formatWireDate, NoteRecord } from '../shared';
import { useCreateNoteMutation } from '../api/client';
import { generateId } from '../lib/utilities';
import { ReloadFunction } from '../common/Load'
import { StoreState } from '../store/store';
import { useSelector } from 'react-redux';
import { IconButton } from '../common/IconButton';
import { MdAddCircleOutline } from 'react-icons/md';

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
  const tagsByName = useSelector((state: StoreState) => state.tags.tagsByName);
  const atsByName = useSelector((state: StoreState) => state.ats.atsByName);

  return (
    <nav className="sidebar">
      <div className="sidebar-panel a-p4">
        <h4>Notes</h4>
        <div className="sidebar-items">
          {notes.map(d => {
            return <div key={d.noteId}><Link to={`/note-remount/${d.noteId}`}>{d.noteId}</Link></div>
          })}
        </div>
        {<IconButton icon={MdAddCircleOutline} onClick={createNote}><div>New document</div></IconButton>}
      </div>

      <div className="sidebar-panel a-p4">
        <h4>Tags</h4>
        <div className="sidebar-items">
          {Object.values(tagsByName).map(tag => (
            <div key={tag.tagId}>#{tag.tagName}</div>
          ))}
        </div>
      </div>

      <div className="sidebar-panel a-p4">
        <h4>Ats</h4>
        <div className="sidebar-items">
          {Object.values(atsByName).map(at => (
            <div key={at.atId}>@{at.atName}</div>
          ))}
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
    </nav>
  );
}