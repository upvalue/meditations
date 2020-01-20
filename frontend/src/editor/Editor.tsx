import React, { useRef, useEffect, useState } from 'react';

import { EditorCore } from './EditorCore';

import { createPopper, Instance } from '@popperjs/core';

import './editor.css';

export const Editor = () => {
  const editorElementRef = useRef<HTMLDivElement | null>(null);
  const popperElementRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<EditorCore | null>(null);
  const popperInstance = useRef<Instance | null>(null);
  const [popperActive, setPopperActive] = useState(false);
  const [completion, setCompletion] = useState('');


  useEffect(() => {
    if (editorElementRef.current !== null) {
      const editor = new EditorCore();
      editorRef.current = editor;
      editor.mount(editorElementRef.current, {
        onAction: (action, range, word) => {
          setCompletion(word);
          const sel = document.getSelection();
          if (sel && popperElementRef.current) {

            if (popperInstance.current) {
              popperInstance.current.update();
            } else {
              setPopperActive(true);
              popperInstance.current =
                createPopper(
                  range, popperElementRef.current, {
                  placement: 'bottom-start'
                });
            }
          }
        },

        onClear: () => {
          if (popperInstance.current) {
            popperInstance.current.destroy();
            popperInstance.current = null;
            setPopperActive(false);
          }
        },
      });
    }
  }, [editorElementRef]);

  return (
    <section>
      <div className="rf-popup p1" ref={popperElementRef} style={popperActive ? {} : { display: 'none' }}>
        {completion}
      </div>
      <div className="p2" ref={editorElementRef} contentEditable={true} suppressContentEditableWarning={true}>
        <div className="rf-editor-line">Click to edit</div>
      </div>
    </section >
  )

}