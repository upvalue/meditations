import React, { useRef, useEffect } from 'react';
import Editor from './editor';
import './editor.css';

const App = () => {
  const ref = useRef<HTMLDivElement | null>(null);

  const editorRef = useRef<Editor | null>(null);

  useEffect(() => {
    if (ref.current !== null) {
      const editor = new Editor();
      editorRef.current = editor;
      editor.mount(ref.current);
    }
  }, [ref]);

  const actionReset = () => {
    if (!ref.current) return;
    ref.current.innerHTML = `<div className="rf-editor-line">Click to edit</div>`;
  }

  return (
    <div className="App flex justify-center pt3">
      <div className="flex">

        <div className="p2" ref={ref} contentEditable={true} suppressContentEditableWarning={true}>
          <div className="rf-editor-line">Click to edit</div>
        </div>
      </div>
    </div>
  );
}

export default App;
