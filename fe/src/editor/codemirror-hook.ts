// codemirror-ext.ts - CodeMirror wrapper and
import { useEffect, useRef } from 'react'

import {
  Decoration,
  EditorView,
  keymap,
  ViewPlugin,
  ViewUpdate,
  type PluginValue,
} from '@codemirror/view'
import { emacsStyleKeymap } from '@codemirror/commands'
import { EditorState, RangeSetBuilder } from '@codemirror/state'
import type { ZLine } from './schema'
import { useAtom } from 'jotai'
import { docAtom } from './TEditor'
import { produce } from 'immer'

export type LineInfo = {
  line: ZLine
  lineIdx: number
}

export type CallbackTable = {
  // Keymap callbacks
  Enter: () => boolean
  'Shift-Tab': () => boolean
  Tab: () => boolean
  Backspace: () => boolean

  // Editor state callbacks
  contentUpdated: (content: string) => void
}

const tagPattern = /#[a-zA-Z0-9_-]+/g

const makeTagDecoration = (tag: string) => {
  return Decoration.mark({
    class: 'cm-tag cursor-pointer',
    tagName: 'span',
    attributes: {
      'data-name': tag,
      onclick: `window.dispatchEvent(new CustomEvent('cm-tag-click', { detail: { name: "${tag}" } }))`,
    },
  })
}

/*const tagDecoration = Decoration.mark({
  class: 'cm-tag',
  tagName: 'span',
  attributes: {
    onclick: `console.log('hi test')`,
  },
})*/

const tagPlugin = ViewPlugin.fromClass(
  class implements PluginValue {
    decorations = Decoration.none

    constructor(view: EditorView) {
      this.decorations = this.buildDecorations(view)
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = this.buildDecorations(update.view)
      }
    }

    buildDecorations(view: EditorView) {
      const builder = new RangeSetBuilder<Decoration>()

      for (const { from, to } of view.visibleRanges) {
        const text = view.state.doc.sliceString(from, to)
        let match: RegExpExecArray | null

        tagPattern.lastIndex = 0
        while ((match = tagPattern.exec(text)) !== null) {
          const start = from + match.index
          const end = start + match[0].length
          builder.add(start, end, makeTagDecoration(match[0]))
        }
      }

      return builder.finish()
    }
  },
  {
    decorations: (value) => value.decorations,
  }
)

/**
 * Sets up a codemirror editor; returns several references
 * that are used to mount codemirror
 */
export const useCodeMirror = (lineInfo: LineInfo) => {
  const cmCallbacks = useRef<CallbackTable>({
    Enter: () => false,
    'Shift-Tab': () => false,
    Tab: () => false,
    Backspace: () => false,
    contentUpdated: () => {},
  })
  const cmRef = useRef<HTMLDivElement>(null)
  const cmView = useRef<EditorView | null>(null)
  const [doc, setDoc] = useAtom(docAtom)

  const makeEditor = () => {
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
      {
        key: 'Backspace',
        run: () => cmCallbacks.current.Backspace() ?? false,
      },
    ])

    const updateListener = EditorView.updateListener.of((update) => {
      if (cmCallbacks.current && cmCallbacks.current.contentUpdated) {
        cmCallbacks.current.contentUpdated(update.state.doc.toString())
      }
    })

    const state = EditorState.create({
      doc: lineInfo.line.mdContent,
      extensions: [
        updateListener,
        customKeymap,
        keymap.of(emacsStyleKeymap),
        EditorView.lineWrapping,
        tagPlugin,
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
  }

  useEffect(() => {
    if (!cmView.current) return
    const { line, lineIdx } = lineInfo
    cmCallbacks.current = {
      // List sink and lift
      Tab: () => {
        // Don't allow indenting more than one level past previous line
        if (lineIdx === 0) return false
        if (lineIdx > 0 && line.indent > doc.children[lineIdx - 1].indent) {
          return false
        }
        setDoc((recentDoc) => {
          return produce(recentDoc, (draft) => {
            draft.children[lineIdx].indent += 1
          })
        })
        return true
      },

      'Shift-Tab': () => {
        if (line.indent === 0) {
          return false
        }
        setDoc((recentDoc) => {
          return produce(recentDoc, (draft) => {
            draft.children[lineIdx].indent -= 1
          })
        })
        return true
      },

      // Enter and backspace (line creation and deletion)
      Backspace: () => {
        return false
      },

      Enter: () => {
        // console.log('enter called along with line ', lineInfo)
        const view = cmView.current

        if (!view) return false

        const { state } = view
        const { selection } = state

        let newLine = ''

        const docEnd = state.doc.length

        // Handling cursor and selection:
        // We delete any text which the user has selected
        // Any text after selection (or the cursor if there is no selection)
        // becomes part of the new line
        if (!selection.main.empty) {
          const { from, to } = selection.main

          newLine = state.doc.slice(to, docEnd).toString()

          view.dispatch({
            changes: {
              from,
              to: docEnd,
              insert: '',
            },
          })

          // console.log('Delete from', from, 'to', to)
        } else {
          const from = selection.main.anchor
          newLine = state.doc.slice(from, docEnd).toString()
          // console.log('Creating new line', newLine)

          view.dispatch({
            changes: {
              from,
              to: docEnd,
              insert: '',
            },
          })
        }

        // console.log('Enter: adding new line with content', newLine)

        setDoc((recentDoc) => {
          return produce(recentDoc, (draft) => {
            draft.children.splice(lineIdx + 1, 0, {
              type: 'line',
              mdContent: newLine,
              indent: line.indent,
            })
          })
        })

        return true
      },

      contentUpdated: (content: string) => {
        console.log('Line', lineIdx, 'content updated', content)
        setDoc((recentDoc) => {
          return produce(recentDoc, (draft) => {
            draft.children[lineIdx].mdContent = content
          })
        })
      },
    }

    const v = cmView.current

    // When the document itself is updated, we need to synchronize
    // React state with Codemirror state
    if (v.state.doc.toString() !== line.mdContent) {
      console.log('Line changed externally, updating', lineInfo.lineIdx)
      cmView.current?.destroy()
      makeEditor()
      /*

      v.dispatch({
        changes: {
          from: 0,
          to: doc.children.length,
          insert: line.mdContent,
        },
      })*/
    }
  }, [lineInfo])

  useEffect(makeEditor, [])

  return {
    cmCallbacks,
    cmRef,
    cmView,
  }
}
