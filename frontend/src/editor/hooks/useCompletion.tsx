import React, { useCallback } from 'react';
import { useState, useRef, useReducer, useEffect } from "react";
import { usePopper } from "react-popper";
import { VirtualElement } from "@popperjs/core";

import { EditorInstance, insertCollectionEntry } from "../lib/editor";
import { Editor, Range, Transforms } from 'slate';
import { ReactEditor } from 'slate-react';
import { TState } from '../../store/types';
import { useSelector } from 'react-redux';
import { Raised } from '../../arche';

export type CompletionState = {
  // Completion state
  editor?: EditorInstance;
  completionType: 'collection';
  target?: Range;
  search: string;
  selectedIndex: number;
}

export type CompletionAction = {
  type: 'clear'
} | {
  type: 'update',
  state: CompletionState;
};

const initialCompletionState: CompletionState = {
  editor: undefined,
  completionType: 'collection',
  target: undefined,
  search: '',
  selectedIndex: 0,
};

const completionReducer = (state: CompletionState, action: CompletionAction) => {
  console.log(state, action);
  switch (action.type) {
    case 'update':
      return action.state;
    case 'clear':
      return initialCompletionState;
    default:
      return state;
  }
}

/**
 * useCompletion is a hook that manages completion state. Separated out for
 * code cleanliness purposes.
 * 
 * Basic flow:
 * On each editor update, check whether completion is called for
 * 
 * If called for, query for completions and return the appropriate things to render a popper
 * completion element
 * 
 * Accept completion selection results and trigger a callback
 */
export const useCompletion = () => {
  const [completionState, completionDispatch] = useReducer(completionReducer, initialCompletionState);

  const [popperElement, setPopperElement] = useState<HTMLDivElement | null>(null);
  const virtualElement = useRef<VirtualElement>({
    getBoundingClientRect: () => new DOMRect(0, 0, 0, 0)
  });

  const { styles, attributes, update, forceUpdate, state } = usePopper(virtualElement.current, popperElement, {
    placement: 'bottom-start',
  });

  const onUpdate = useCallback(
    (editor: EditorInstance) => {
      const { selection } = editor;

      if (selection && Range.isCollapsed(selection)) {
        const [start] = Range.edges(selection);
        const wordBefore = Editor.before(editor, start, { unit: 'word' });
        const before = wordBefore && Editor.before(editor, wordBefore);
        const beforeRange = before && Editor.range(editor, before, start);
        const beforeText = beforeRange && Editor.string(editor, beforeRange);

        // Determine if this is the beginning of a line
        // (at a depth of exactly two, word offset is zero)
        if (before && beforeRange && beforeText && before.path.length === 2 && before.offset === 0) {
          if (beforeText[0] === '@') {
            completionDispatch({
              type: 'update',
              state: {
                editor,
                completionType: 'collection',
                target: beforeRange,
                search: beforeText.slice(1),
                selectedIndex: 0,
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
    }, [completionState]);

  // Update popper's virtual reference element.
  // This needs to be done after onUpdate, because otherwise 
  // the range we're trying to target will not yet be
  // valid in Slate, and this toDOMRange call will
  // cause an error
  useEffect(() => {
    const { editor, target } = completionState;
    if (!editor) return;
    if (!target) return;
    if (!update) return;

    const domRange = ReactEditor.toDOMRange(editor, target);
    const rect = domRange.getBoundingClientRect();
    virtualElement.current.getBoundingClientRect = () => rect;
    update();
  }, [completionState.target, completionState.editor, completionState.selectedIndex]);

  // If autocomplete state is present, search for potential autocompletions and provide them for
  // rendering

  const searchPresent = completionState.search !== '';

  // Find relevant collections
  const searchItems = useSelector((s: TState) => {
    return Object.keys(s.collections).filter(c => c.toLowerCase().startsWith(completionState.search.toLowerCase())).map(k => s.collections[k]);
  });

  const onKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    const { target } = completionState;

    if (target) {
      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          if (completionState.selectedIndex < searchItems.length) {
            completionDispatch({
              type: 'update',
              state: {
                ...completionState,
                selectedIndex: completionState.selectedIndex + 1,
              }
            });
          }
          break;
        case 'ArrowUp':
          event.preventDefault();
          if (completionState.selectedIndex > 0) {
            completionDispatch({
              type: 'update',
              state: {
                ...completionState,
                selectedIndex: completionState.selectedIndex - 1,
              }
            })
          }
          break;
        case 'Enter':
          event.preventDefault();
          if (!completionState.editor || !completionState.target) return;
          Transforms.select(completionState.editor, target);

          const collectionName = (completionState.selectedIndex >= searchItems.length) ? completionState.search : searchItems[completionState.selectedIndex].name;

          insertCollectionEntry(completionState.editor, collectionName);
          break;
      }
    }
  }, [completionState.editor, completionState.search, completionState.target, completionState.selectedIndex, searchItems]);


  return {
    completionProps: {
      selectedIndex: completionState.selectedIndex,
      searchItems: searchItems.map(c => c.name),
      setPopperElement,
      styles,
      attributes,
      active: completionState.target !== undefined,
    },
    onUpdate,
    onKeyDown: searchPresent ? onKeyDown : undefined,
  };
}

export type CompleteItemProps = {
  item: string;
  selected: boolean;
};

export const CompleteItem = (props: CompleteItemProps) => {
  const { item, selected } = props;
  return <span>
    {selected && '-> '}

    {item}
  </span>
}

export type CompleteProps = {
  searchItems: ReadonlyArray<string>,
  selectedIndex: number,
  active: boolean,
  setPopperElement: (elt: HTMLDivElement | null) => void,
  styles: {
    [key: string]: React.CSSProperties,
  },
  attributes: {
    [key: string]: {
      [key: string]: string;
    }
  }
}

/**
 * Complete component. Handles actually rendering completion info from useCompletion
 */
export const Complete = (props: CompleteProps) => {
  const { searchItems, selectedIndex } = props;

  return (
    <div ref={props.setPopperElement} style={{ ...props.styles.popper, display: props.active ? '' : 'none' }} {...props.attributes.popper}>
      <Raised flex="column" padding={["px3", "py2"]} margin={["mt2"]}>
        {searchItems.map((s, i) => (
          <CompleteItem item={s} selected={i === selectedIndex} key={s} />
        ))}
        <hr />
        <CompleteItem item="+ Add a new thing" selected={selectedIndex === searchItems.length} />
      </Raised>
    </div>
  );
}