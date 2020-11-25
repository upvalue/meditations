import React from 'react';
import { useRouteMatch } from 'react-router';
import { useGetNoteQuery } from '../api/client';
import { Load } from '../common/Load';
import { TEditor } from '../editor/TEditor';

// @refresh reset
// Fast refresh doesn't work with SlateJS currently.
// https://github.com/ianstormtaylor/slate/issues/3621

type RouteParams = {
  noteId: string;
};

export const NoteRoute = (props: {}) => {
  const match = useRouteMatch<RouteParams>();

  const { noteId } = match.params;

  return (
    <Load
      hook={useGetNoteQuery}
      options={{
        variables: {
          noteId,
        }
      }}
      render={({ data }) => {
        return data &&
          <TEditor
            note={data.getNote}
            body={JSON.parse(data.getNote.body)}
            onSave={(noteId, body) => null}

          />
      }}
    />
  );
}