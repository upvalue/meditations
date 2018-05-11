// context.ts - React context

// Used to store modal

import * as React from 'react';
import { ModalPromptOptions } from '../common';

function createMandatoryContext<T>(defaultValue?: T) {
  const context = React.createContext<T>((undefined as any) as T);
  const consumer: React.Consumer<T> = (props) => {
    return (
      <context.Consumer>
        {state => (state ? props.children(state)
          : <span style={{ color: 'red' }}>Missing Context</span>)}
      </context.Consumer>
    );
  };
  return {
    Provider: context.Provider,
    Consumer: consumer,
  };
}

export interface MeditationsContext {
  data: {
    modalOpen: boolean;
  };

  modalPrompt: (something: string) => void;
}

export const commonContextInitial = {
  data: {
    modalOpen: false,
  },

  modalPrompt: (something) => {
    console.log(something);
  },
} as MeditationsContext;

export const commonContext = createMandatoryContext<MeditationsContext>();
