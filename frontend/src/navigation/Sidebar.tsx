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
    <div className="sidebar a-mr4">
      <div className="a-p4">
        <h3>Refractory</h3>

        <div className="a-mt4" style={{ lineHeight: '32px' }}>
          <div className="a-bold">Documents</div>
          {documents.map(d => {
            return <div key={d.id}><Link to={`/document/${d.id}`}>{d.id}</Link></div>
          })}

          <Button onClick={createDoc}>+ New document</Button>
        </div>

        <div className="a-mt4">
          <div className="a-bold">Collections</div>
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