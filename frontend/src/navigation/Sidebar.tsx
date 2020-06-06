import React, { useCallback, useState } from 'react';
import { TState } from '../store/types';
import { useSelector, useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import { createDocument } from '../store/store';
import { saveState, initialState } from '../store/storage';

export const Sidebar = () => {
  const { documents, collections } = useSelector((state: TState) => state);

  const dispatch = useDispatch();
  const createDoc = useCallback(() => dispatch(createDocument({})), []);

  const [confirm, setConfirm] = useState(false);

  return (
    <div className="sidebar mr4">
      <div className="p2">
        <h3>Refractory</h3>

        <div className="mt2">
          <div className="bold">Documents</div>
          {documents.map(d => {
            return <div key={d.id}><Link to={`/document/${d.id}`}>{d.id}</Link></div>
          })}

          <button onClick={createDoc}>+ New document</button>


        </div>

        <div className="mt2">
          <div className="bold">Collections</div>
          {Object.entries(collections).map(([k, collection]) => <div key={k}><Link to={`/collections/${k}`}>@{collection.name}</Link></div>)}
        </div>

        <div className="mt2">
          <button onClick={() => {
            if (confirm) {
              saveState(initialState);
              window.location.reload();
            } else {
              setConfirm(true);
            }
          }}>
            {confirm && "Are you sure?"}
            {!confirm && "Delete state"}


          </button>
        </div>

      </div>
    </div>
  );
}