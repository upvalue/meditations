import React, { useRef, useMemo, useState, useEffect, useCallback, useReducer } from 'react';

import { Slate, Editable, withReact, ReactEditor } from 'slate-react'
import { NodeEntry, Node, Range, Text, Editor } from 'slate';

import { makeEditor } from './lib/editor';
import { markdownRanges } from './lib/markdown';
import { TDocument, TDocumentRecord } from '../store/types';
import { RenderLeaf } from './RenderLeaf';
import { RenderElement } from './RenderElement';
import { Complete } from './Complete';

export type Props = {
  document: TDocumentRecord;
}

/**
 * This function handles decorating SlateJS text
 * nodes with Markdown
 */
const decorate = ([node, path]: NodeEntry<Node>) => {
  const ranges: Range[] = [];

  if (!Text.isText(node)) {
    return ranges;
  }

  return markdownRanges(node.text).map(node => ({
    [node.type]: true,
    anchor: { path, offset: node.start },
    focus: { path, offset: node.end },
  }));
};

/**
 * Editor with custom extensions
 */
export const TEditor = (props: Props) => {
  const ref = useRef<HTMLDivElement | null>(null);

  const completionPopup = useRef<any>(null);

  const selectedDocument = props.document;
  const editor = useMemo(() => makeEditor(), [])

  // This is the actual content of the editor
  const [body, setBody] = useState<TDocument>([
    {
      type: 'line',
      children: [{ text: 'should not be shown' }]
    }
  ]);

  // If the route changes, update the editor content with the new document
  useEffect(() => {
    setBody(selectedDocument.document);
  }, [selectedDocument.id]);

  return (
    <>
      <Slate editor={editor} value={body} onChange={newValue => {
        setBody(newValue as any);

        // Check for any completions that may be necessary
        /*
        const { selection } = editor;

        // TODO: Space should clear selection
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
                  target: beforeRange,
                  search: beforeText.slice(1),
                  index: 0,
                }
              });
              return;
            }
          }
        }

        if (completionState.target) {
          completionDispatch({
            type: 'clear',
          });
        }
        */
      }}>
        <div className="editor p2" ref={ref}>
          <Editable decorate={decorate} renderElement={RenderElement} renderLeaf={RenderLeaf} />
        </div>
        <Complete
          body={body}
          editor={editor}
        />
      </Slate>
      <div className="doc">
        <pre>
          {JSON.stringify(body, null, 2)}
        </pre>
      </div>
    </>
  )
}