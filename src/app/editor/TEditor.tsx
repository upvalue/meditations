'use client';

import {EditorProvider} from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Mention from '@tiptap/extension-mention';

import { useCallback, useMemo } from 'react';
import {debounce} from 'lodash-es';

import {suggestion} from './suggestion';

const content = `
<p>document 1</p>
`;

const mention = Mention.configure({
  HTMLAttributes: {
    class: 'mention',
  },
  suggestion,
});

export const TEditor = (props: {
  updateDocument: (json: string) => void,
}) => {
  const updateDocumentProp = props.updateDocument;

  const updateDocument = useMemo(() => debounce((p: any) => {
    updateDocumentProp(JSON.parse(JSON.stringify(p.editor.getJSON())));
  }, 500), [updateDocumentProp]);

  return <section className="prose dark:prose-invert">
    <EditorProvider extensions={[StarterKit, mention]} content={content} onUpdate={updateDocument}>
      <>      </>
    </EditorProvider>
  </section>
}