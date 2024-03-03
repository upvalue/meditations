'use client';

import {EditorProvider} from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

const content = '<p>hello world!</p>';

export const TEditor = () => {
  return <section className="prose dark:prose-invert">
    <EditorProvider extensions={[StarterKit]} content={content}>
      <>
      </>
    </EditorProvider>
  </section>
}