import React from 'react';
import { useSelector } from 'react-redux';
import { TState } from '../store/types';
import { TEditor } from '../editor/TEditor';
import { useRouteMatch } from 'react-router';

type RouteParams = {
  documentId: string;
};

export const DocumentRoute = (props: {}) => {
  const match = useRouteMatch<RouteParams>();

  const { documentId } = match.params;

  // const selectedDocument = useSelector((state: TState) => state.documents.find(doc => doc.noteId === documentId));

  return (
    <>
      hot diggity dog
    </>
  );
}