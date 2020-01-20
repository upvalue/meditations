import React, { useRef, useEffect, useState, useCallback } from 'react';
import produce from 'immer';

import { EditorCore, EditorCallbacks, EditorActionKey } from './EditorCore';

import { createPopper, Instance } from '@popperjs/core';

import './editor.css';

export type Note = {
  type: 'note';
  id: string;
  body: string;
};

export type Log = {
  type: 'log';
  id: string;
  name: string,
  note?: Note;
};

type Node = Note | Log;

let gensymi = 0;
const gensym = (type: string) => {
  return `${type}-${gensymi++}`;
};

export type NoteProps = {
  callbacks: EditorCallbacks,
  node: Note,
}

export const CNote = (props: NoteProps) => {
  const editorElementRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<EditorCore | null>(null);

  const { onAction, onClear, onActionKeydown } = props.callbacks;

  useEffect(() => {
    if (editorElementRef.current !== null) {
      const editor = new EditorCore();
      editorRef.current = editor;
      editor.mount(props.node.id, editorElementRef.current, {
        onAction,
        onActionKeydown,
        onClear,
      });
    }

    return () => {
      if (editorRef.current) {
        editorRef.current.unmount();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editorElementRef]);


  return (
    <div
      ref={editorElementRef}
      contentEditable={true}
      suppressContentEditableWarning={true}
      dangerouslySetInnerHTML={{ __html: props.node.body }}
    />
  );
}

export type LogProps = {
  node: Log,
};

export const CLog = (props: LogProps) => {
  const { node } = props;
  return (
    <p>{node.name}</p>
  )
}

const initalNodes: Node[] = [
  {
    type: 'note',
    id: gensym('note'),
    body: '<div class="rf-editor-line">Click to edit</div>',
  }
];

// is each of these persisted?

export const Page = () => {
  const popperElementRef = useRef<HTMLDivElement | null>(null);
  const popperInstance = useRef<Instance | null>(null);
  const [popperActive, setPopperActive] = useState(false);

  const [completion, setCompletion] = useState('');
  const completionRef = useRef<string>('');

  const [nodes, setNodes] = useState<Node[]>(initalNodes);
  const nodesRef = useRef<Node[]>(nodes);

  const onActionKeydown = useCallback((editorCore: EditorCore, key: EditorActionKey) => {
    editorCore.splitOnAction(completionRef.current, (nodeId, before, line, after) => {
      nodesRef.current = (produce(nodesRef.current, draft => {
        const nodeIdx = draft.findIndex(n => n.id === nodeId);

        const newNodes: Node[] = [];

        if (before) {
          newNodes.push({
            type: 'note',
            id: gensym('note'),
            body: before,
          });
        }

        const logId = gensym('log');

        newNodes.push({
          type: 'log',
          id: logId,
          name: logId,
        })

        if (after) {
          newNodes.push({
            type: 'note',
            id: gensym('note'),
            body: after,
          });
        } else if (nodeIdx === nodes.length - 1) {
          newNodes.push({
            type: 'note',
            id: gensym('note'),
            body: '<div class="rf-editor-line">&#8203;</div>',
          });
        }

        draft.splice(nodeIdx, before ? 1 : 0, ...newNodes);

        onClear();
      }));
      setNodes(nodesRef.current);
    });
  }, []);

  const onAction = useCallback((action: 'collection', range: Range, word: string) => {
    setCompletion(word);
    completionRef.current = word;
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

  }, [])

  const onClear = useCallback(() => {
    if (popperInstance.current) {
      popperInstance.current.destroy();
      popperInstance.current = null;
      setPopperActive(false);
    }
  }, []);

  console.log(nodes);

  return (
    <section >
      <div className="rf-popup p1" ref={popperElementRef} style={popperActive ? {} : { display: 'none' }}>
        {completion}
      </div>

      {nodes.map((n) => {
        switch (n.type) {
          case 'note': {
            return <CNote key={n.id} callbacks={{ onActionKeydown, onAction, onClear }} node={n} />
          }
          case 'log': {
            return <CLog key={n.id} node={n} />;
          }
        }

      })}


    </section >
  )

}