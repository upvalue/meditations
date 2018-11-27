import React from 'react';

import { Scope } from "./Scope";
import { Task } from '../api';

interface ScopeContainerProps {
  className?: string;
  date: string;
  title: string;
  tasks: ReadonlyArray<Partial<Task>>;
}

export const ScopeContainer = React.memo((props: ScopeContainerProps) => {
  return (
    <Scope {...props} />
  );
});
