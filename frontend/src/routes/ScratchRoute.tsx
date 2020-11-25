import React from 'react';
import { useRouteMatch } from 'react-router';
import { useGetNoteQuery } from '../api/client';
import { Load } from '../common/Load';
import { TEditor } from '../editor/TEditor';

// @refresh reset
// Fast refresh doesn't work with SlateJS currently.
// https://github.com/ianstormtaylor/slate/issues/3621

/**
 * Route for developing on the editor with no backend calls
 * @param props 
 */
export const ScratchRoute = (props: {}) => {
  return (
    <TEditor
      note={{
        noteId: 'note-scratch',
        body: '[]',
      }}
      body={[]}
      onSave={(noteId, body) => null}
    />
  );
}
