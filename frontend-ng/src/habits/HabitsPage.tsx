
import React from 'react';
import { RouteComponentProps } from '@reach/router';

export interface HabitsPageProps extends RouteComponentProps { }

export const HabitsPage = (props: HabitsPageProps) => {
  return (
    <>
      <div>
        sidebar
      </div>

      <div>
        daily scopes
      </div>

      <div>
        monthly scope
      </div>
    </>
  );
}
