import React from 'react';
import { RouteComponentProps } from '@reach/router';

export interface NotesPageProps extends RouteComponentProps {
}

export const NotesPage = (props: NotesPageProps) => {
  return (
    <>
      <div className="flex flex-column" style={{ width: '16em' }}>
        <div className="sidebar flex flex-column flex-auto">
          <span>Browse some entries</span>
          <span>Add an entry or whatever.</span>
        </div>
      </div>

      <div className="ml3 pt3">
        <h3 className="my0">Journal Entry</h3>
        <p>
          Type some things here, type some other things there, type something anywhere you please!
        </p>
      </div>
    </>
  );
}