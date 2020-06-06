import React, { useEffect, useReducer, useState, useRef } from 'react';
import { Editor, Range } from 'slate';
import { ReactEditor } from 'slate-react';
import { EditorInstance } from './lib/editor';
import { TDocument } from '../store/types';
import { createPopper } from '@popperjs/core/lib/popper-lite';
import { generateId } from '../lib/utilities';
import { useSelector } from 'react-redux';

type Props = {
  body: TDocument;
  editor: EditorInstance;
}

export type CompletionState = {
  // Completion state
  completionType: 'collection';
  target?: Range;
  search: string;
  index: number;
}

export type CompletionAction = {
  type: 'clear'
} | {
  type: 'update',
  state: CompletionState;
};

const initialCompletionState: CompletionState = {
  completionType: 'collection',
  target: undefined,
  search: '',
  index: 0,
};

const completionReducer = (state: CompletionState, action: CompletionAction) => {
  switch (action.type) {
    case 'update':
      return action.state;
    case 'clear':
      return initialCompletionState;
    default:
      return state;
  }
}

// IMPROVEMENTS:

/**
 * Completion helper.
 * @param props 
 */
export const Complete = (props: Props) => {
  const { body, editor } = props;

  const popperInstance = useRef<any>(null);
  const [completionState, completionDispatch] = useReducer(completionReducer, initialCompletionState);
  const [popperId] = useState(generateId('popper'));
  const virtualElement = useRef<any>(null);

  useEffect(() => {
    const { target } = completionState;
    if (target) {
      const popperElement = document.getElementById(popperId);

      const domRange = ReactEditor.toDOMRange(editor, target);
      const rect = domRange.getBoundingClientRect();
      if (popperInstance.current && virtualElement.current) {
        // virtualElement.current.getBoundingClientRect = () => rect;
        popperInstance.current.update();
      } else if (popperElement) {
        virtualElement.current = {
          getBoundingClientRect: () => rect,
        }
        popperInstance.current = createPopper(virtualElement.current, popperElement, {
          placement: 'bottom-start',
        });
      }
    }
  }, [completionState.target, completionState.index])

  useEffect(() => {
    const { selection } = editor;

    if (selection && Range.isCollapsed(selection)) {
      const [start] = Range.edges(selection);
      const wordBefore = Editor.before(editor, start, { unit: 'word' });
      const before = wordBefore && Editor.before(editor, wordBefore);
      const beforeRange = before && Editor.range(editor, before, start);
      const beforeText = beforeRange && Editor.string(editor, beforeRange);

      // Determine if this is the beginning of a line
      // (at a depth of exactly two, word offset is zero)
      if (before && beforeText && before.path.length === 2 && before.offset === 0) {
        if (beforeText[0] === '@') {
          completionDispatch({
            type: 'update',
            state: {
              completionType: 'collection',
              target: beforeRange,
              search: beforeText.slice(1),
              index: 0,
            }
          });
          return;
        }
      }
    }

    // If the selection changes and this isn't a line beginning with @, clear completion
    if (completionState.target) {
      completionDispatch({
        type: 'clear'
      });
    }

  }, [body, editor.selection]);


  return (
    <div className="Complete" id={popperId} style={completionState.target ? {} : { display: 'none' }}>
      <div>
        completionatrix
      </div>
    </div>
  );
}