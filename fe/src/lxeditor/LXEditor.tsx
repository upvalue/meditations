import React from 'react'
import { $getRoot, $getSelection, type EditorState } from 'lexical'
import { useEffect } from 'react'

import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { PlainTextPlugin } from '@lexical/react/LexicalPlainTextPlugin'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'

// Theme configuration
const theme = {
  // Theme styling goes here
  paragraph: 'mb-2',
}

// Catch any errors that occur during Lexical updates
function onError(error) {
  console.error(error)
}

// When the editor changes, you can get notified via the
// OnChangePlugin!
function onChange(editorState: EditorState) {
  editorState.read(() => {
    // Read the contents of the EditorState here.
    const root = $getRoot()
    const selection = $getSelection()
    console.log(editorState.toJSON())

    // console.log(root, selection)
  })
}

// Define the initial configuration
const initialConfig = {
  namespace: 'MyEditor',
  theme,
  onError,
}

export const LXEditor = () => {
  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Lexical Plaintext Editor</h1>

      <LexicalComposer initialConfig={initialConfig}>
        <div className="relative border border-gray-300 rounded-lg">
          <PlainTextPlugin
            contentEditable={
              <ContentEditable className="min-h-[200px] p-4 text-base outline-none" />
            }
            placeholder={
              <div className="absolute top-4 left-4 text-gray-400 pointer-events-none">
                Enter some plain text...
              </div>
            }
          />
          <OnChangePlugin onChange={onChange} />
          <HistoryPlugin />
        </div>
      </LexicalComposer>

      <div className="mt-4 text-sm text-gray-600">
        <p>Features:</p>
        <ul className="list-disc list-inside mt-2">
          <li>Plain text editing</li>
          <li>Undo/Redo support (Ctrl/Cmd + Z/Y)</li>
          <li>Auto-focus on load</li>
          <li>Change detection with console logging</li>
        </ul>
      </div>
    </div>
  )
}
