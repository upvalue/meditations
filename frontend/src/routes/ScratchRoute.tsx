import React, { useEffect, useState } from 'react';
import { TEditor } from '../editor/TEditor';
import constate from 'constate';

// @refresh reset
// Fast refresh doesn't work with SlateJS currently.
// https://github.com/ianstormtaylor/slate/issues/3621

const useScratch = ({ scratch }: { scratch: boolean }) => useState(scratch);

/**
 * Allows children to determine whether they should be making backend calls
 */
export const [ScratchProvider, useScratchContext] = constate(useScratch);

/**
 * Route for developing on the editor with no backend calls
 * @param props 
 */
export const ScratchRoute = (props: {}) => {
  return (
    <ScratchProvider scratch={true}>
      <TEditor
        note={{
          noteId: 'note-scratch',
          title: '',
          body: '[]',
        }}
        body={[]}
        onSave={(noteId, body) => null}
      />
    </ScratchProvider>
  );
}
