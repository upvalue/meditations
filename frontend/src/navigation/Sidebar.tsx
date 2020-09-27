import React, { useCallback, useState } from 'react';
import { TState } from '../store/types';
import { useSelector, useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import { createDocument } from '../store/store';
import { saveState, initialState } from '../store/storage';
import { Button } from '../arche';

export const Sidebar = () => {
  const { documents, collections } = useSelector((state: TState) => state);

  const dispatch = useDispatch();
  const createDoc = useCallback(() => dispatch(createDocument({})), []);

  const [confirm, setConfirm] = useState(false);

  return (
    <div className="sidebar">
      <div className="a-p4">
        <div style={{ lineHeight: '32px' }}>
          <h4>Documents</h4>
          {documents.map(d => {
            return <div key={d.noteId}><Link to={`/document/${d.noteId}`}>{d.noteId}</Link></div>
          })}

          <Button onClick={createDoc}>+ New document</Button>
        </div>

        <div className="a-mt4">
          <h4>Collections</h4>
          {Object.entries(collections).map(([k, collection]) => <div key={k}><Link to={`/collections/${k}`}>@{collection.name}</Link></div>)}
        </div>

        <div className="a-mt4">
          <Button onClick={() => {
            if (confirm) {
              saveState(initialState);
              window.location.reload();
            } else {
              setConfirm(true);
            }
          }}>
            {confirm && "Are you sure?"}
            {!confirm && "Delete state"}
          </Button>
        </div>

      </div>
    </div>
  );
}