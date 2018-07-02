import * as React from 'react';

/** Simple CSS loading spinner */
export const Spinner = (props: any) => {
  return (
    <div className="spinner">
      <div className="bounce1" />
      <div className="bounce2" />
      <div className="bounce3" />
    </div>
  );
};
