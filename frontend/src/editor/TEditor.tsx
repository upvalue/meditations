import React, { useRef, useMemo, useState, useEffect } from 'react';

import { Slate, Editable } from 'slate-react'
import { NodeEntry, Node, Range, Text } from 'slate';

import { makeEditor } from './lib/editor';
import { markdownRanges } from './lib/markdown';
import { NoteBody, NoteRecord } from '../../../shared';
import { RenderLeaf } from './RenderLeaf';
import { RenderElement } from './RenderElement';
import { useCompletion, Complete } from './hooks/useCompletion';

export type Props = {
  document: NoteRecord;
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

  const { onUpdate, completionProps, onKeyDown } = useCompletion();

  const selectedDocument = props.document as any;
  const editor = useMemo(() => makeEditor(), []);

  // This is the actual content of the editor
  const [body, setBody] = useState<NoteBody>([
    {
      type: 'line',
      children: [{ text: 'should not be shown' }]
    }
  ]);

  // If the route changes, update the editor content with the new document
  useEffect(() => {
    setBody(selectedDocument.document);
  }, [selectedDocument.noteId]);

  return (
    <>
      <Slate editor={editor} value={body} onChange={newValue => {
        onUpdate(editor);

        setBody(newValue as any);
      }}>
        <div className="editor a-p4 a-ml4" ref={ref}>
          <Editable
            decorate={decorate}
            renderElement={RenderElement}
            renderLeaf={RenderLeaf}
            onKeyDown={onKeyDown}
          />
        </div>
        <Complete {...completionProps} />
      </Slate>
      <div className="doc a-ml5">
        <pre>
          {JSON.stringify(body, null, 2)}
        </pre>
      </div>
    </>
  )
}