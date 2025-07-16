// codemirror-ext.ts - CodeMirror wrapper and
import React, { useEffect, useRef } from 'react'

import { EditorView, keymap } from '@codemirror/view'
import { emacsStyleKeymap } from '@codemirror/commands'
import { EditorState } from '@codemirror/state'

export type CallbackTable = {
  Enter: () => boolean
  'Shift-Tab': () => boolean
  Tab: () => boolean
  contentUpdated: (content: string) => void
}

/**
 * Sets up a codemirror editor; returns several references
 * that are used to mount codemirror
 */
export const useCodeMirror = (initialContent: string) => {
  const cmCallbacks = useRef<CallbackTable>({
    Enter: () => false,
    'Shift-Tab': () => false,
    Tab: () => false,
    contentUpdated: () => {},
  })
  const cmRef = useRef<HTMLDivElement>(null)
  const cmView = useRef<EditorView | null>(null)

  useEffect(() => {
    const customKeymap = keymap.of([
      {
        key: 'Tab',
        run: () => cmCallbacks.current.Tab() ?? false,
      },
      {
        key: 'Enter',
        run: () => cmCallbacks.current.Enter() ?? false,
      },
      {
        key: 'Shift-Tab',
        run: () => cmCallbacks.current['Shift-Tab']() ?? false,
      },
    ])

    const updateListener = EditorView.updateListener.of((update) => {
      if (cmCallbacks.current && cmCallbacks.current.contentUpdated) {
        cmCallbacks.current.contentUpdated(update.state.doc.toString())
      }
    })

    const state = EditorState.create({
      doc: initialContent,
      extensions: [
        updateListener,
        customKeymap,
        keymap.of(emacsStyleKeymap),
        EditorView.lineWrapping,
      ],
    })

    const view = new EditorView({
      state,
      parent: cmRef.current!,
    })

    cmView.current = view

    return () => {
      view.destroy()
    }
  }, [])

  return { cmCallbacks, cmRef, cmView }
}
