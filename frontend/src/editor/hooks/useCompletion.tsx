import React, { useCallback } from 'react';
import { useState, useRef, useReducer, useEffect } from "react";
import { usePopper } from "react-popper";
import { VirtualElement } from "@popperjs/core";

import { EditorInstance, insertTag } from "../lib/editor";
import { Editor, Range, Transforms } from 'slate';
import { ReactEditor } from 'slate-react';
import { tagSlice, StoreState } from '../../store/store';
import { useDispatch, useSelector } from 'react-redux';
import { Raised } from '../../arche';
import { useScratchContext } from '../../routes/ScratchRoute';
import { generateId } from '../../lib/utilities';
import { useCreateTagMutation } from '../../api/client';

const log = (...args: any[]) => {
  args.unshift(`[complete]`);
  console.log.apply(console, args as any);
}

export type CompletionState = {
  // Completion state
  editor?: EditorInstance;
  completionType: 'at' | 'tag';
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
  completionType: 'tag',
  target: undefined,
  search: '',
  selectedIndex: 0,
};

const completionReducer = (state: CompletionState, action: CompletionAction) => {
  // console.log(state, action);
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

  const [scratch,] = useScratchContext();

  const [, createTagMutation] = useCreateTagMutation();

  const dispatch = useDispatch();

  const [popperElement, setPopperElement] = useState<HTMLDivElement | null>(null);
  const virtualElement = useRef<VirtualElement>({
    getBoundingClientRect: () => new DOMRect(0, 0, 0, 0)
  });

  const { styles, attributes, update } = usePopper(virtualElement.current, popperElement, {
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
        // if (before && beforeRange && beforeText && before.path.length === 2 && before.offset === 0) {
        if (before && beforeRange && beforeText) {
          if (beforeText[0] === '#') {
            completionDispatch({
              type: 'update',
              state: {
                editor,
                completionType: 'tag',
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
  const tagsByName = useSelector((state: StoreState) => state.tags.tagsByName);

  let searchItems: string[] = [];

  if (completionState.completionType === 'tag') {
    searchItems = Object.values(tagsByName).map(t => t.tagName).filter(tagName => tagName.toLowerCase().startsWith(completionState.search.toLowerCase()));
  }

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

          // Pull the completion name from the selection if there is one; if not, user has
          // indicated that they want to add another
          const completionName = (completionState.selectedIndex >= searchItems.length) ? completionState.search : searchItems[completionState.selectedIndex];

          // Generate tagId if not found in map
          const tag = tagsByName[completionName];
          if (!tag) {
            log(`tag ${completionName} not found, generating new tag`);
            const newTagId = generateId('tag');

            if (scratch) {
              insertTag(completionState.editor, newTagId);
            } else {
              createTagMutation({ tagId: newTagId, tagName: completionName }).then(result => {
                // TODO: Handle errors
                if (result.data && completionState.editor) {
                  const tag = result.data.createTag;
                  dispatch(tagSlice.actions.addTag(tag))
                  insertTag(completionState.editor, tag.tagId);
                }
              })
            }
          } else {
            log(`tag ${completionName} found!`);
            insertTag(completionState.editor, tag.tagId);
          }

          break;
      }
    }
  }, [completionState.editor, completionState.search, completionState.target, completionState.selectedIndex, searchItems]);

  return {
    completionProps: {
      selectedIndex: completionState.selectedIndex,
      search: completionState.search,
      searchItems,
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
  search: string,
  active: boolean,
  setPopperElement: (elt: HTMLDivElement | null) => void,
  styles: {
    [key: string]: React.CSSProperties,
  },
  attributes: {
    [key: string]: {
      [key: string]: string;
    } | undefined
  }
}

/**
 * Complete component. Handles actually rendering completion info and user selection from useCompletion
 */
export const Complete = (props: CompleteProps) => {
  const { searchItems, search, selectedIndex } = props;

  return (
    <div ref={props.setPopperElement} style={{ ...props.styles.popper, display: props.active ? '' : 'none' }} {...props.attributes.popper}>
      <Raised flex="column" padding={["px3", "py2"]} margin={["mt2"]}>
        {searchItems.map((s, i) => (
          <CompleteItem item={s} selected={i === selectedIndex} key={s} />
        ))}
        <hr />
        <CompleteItem item={`+ Add #${search}`} selected={selectedIndex === searchItems.length} />
      </Raised>
    </div>
  );
}