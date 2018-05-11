// context.ts - React context

// Used to store modal

import * as React from 'react';

export interface MeditationsContext {
}

export const commonContext = React.createContext<MeditationsContext>({
  modalOpen: false,
});
