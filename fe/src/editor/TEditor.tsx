import { useEffect, useRef } from 'react'
import type { ZDoc, ZLine } from './Schema'
// import { EditorView, EditorState, basicSetup } from '@codemirror/basic-setup'

import { EditorView, keymap } from '@codemirror/view'
import { emacsStyleKeymap } from '@codemirror/commands'
import { EditorState } from '@codemirror/state'

import './TEditor.css'
import { Icon } from '@/Icon'
import { ListBulletIcon } from '@heroicons/react/20/solid'

import { atom, useAtom } from 'jotai'

import { produce } from 'immer'
import { useCodeMirror } from './codemirror-hook'

// TODO: Consider renaming doc to outline in order
// to reduce conflicts with builtin codemirror concepts

export const docAtom = atom<ZDoc>({
  type: 'doc',
  children: [
    {
      type: 'line',
      mdContent: 'The world is your canvas',
      indent: 0,
    },
  ],
})

const ELine = ({ line, lineIdx }: { line: ZLine; lineIdx: number }) => {
  const { cmCallbacks, cmRef, cmView } = useCodeMirror(line.mdContent)

  // Codemirror of course doesn't receive recreated
  // callbacks with new component state; this table
  // lets us update them on the fly

  const [doc, setDoc] = useAtom(docAtom)

  useEffect(() => {
    cmCallbacks.current = {
      // List sink and lift
      Tab: () => {
        // Don't allow indenting more than one level past previous line
        if (lineIdx === 0) return false
        if (lineIdx > 0 && line.indent > doc.children[lineIdx - 1].indent) {
          return false
        }
        const newDoc = produce(doc, (draft) => {
          draft.children[lineIdx].indent += 1
        })
        setDoc(newDoc)
        return true
      },

      'Shift-Tab': () => {
        if (line.indent === 0) {
          return false
        }
        const newDoc = produce(doc, (draft) => {
          draft.children[lineIdx].indent -= 1
        })
        setDoc(newDoc)
        return true
      },

      // Enter and backspace (line creation and deletion)

      Enter: () => {
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

          console.log('Delete from', from, 'to', to)
        } else {
          const from = selection.main.anchor
          newLine = state.doc.slice(from, docEnd).toString()

          view.dispatch({
            changes: {
              from,
              to: docEnd,
              insert: '',
            },
          })
        }

        const newDoc = produce(doc, (draft) => {
          draft.children.splice(lineIdx + 1, 0, {
            type: 'line',
            mdContent: newLine,
            indent: line.indent,
          })
        })

        setDoc(newDoc)
        return true
      },

      contentUpdated: (content: string) => {
        const newDoc = produce(doc, (draft) => {
          draft.children[lineIdx].mdContent = content
        })
        setDoc(newDoc)
      },
    }

    if (cmView.current) {
      const v = cmView.current

      if (v.state.doc.toString() !== line.mdContent) {
        console.log('Line changed externally, update editor')
        v.dispatch({
          changes: {
            from: 0,
            to: doc.children.length,
            insert: line.mdContent,
          },
        })
      }
    }
  }, [line])

  return (
    <div
      className="e4-line flex items-center gap-2 w-full"
      style={{
        marginLeft: `${line.indent * 16}px`,
      }}
    >
      <Icon icon={ListBulletIcon} />
      <div className="cm-editor-container w-full" ref={cmRef} />
    </div>
  )
}

interface TEditorProps {}

export const TEditor = () => {
  const [doc] = useAtom(docAtom)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          // @ts-expect-error
          if (mutation.target.classList.contains('cm-content')) {
            // @ts-expect-error
            mutation.target.focus()
          }
        }
      })
    })

    observer.observe(containerRef.current, {
      childList: true,
      subtree: true, // Watch all descendants
    })

    return () => {
      observer.disconnect()
    }
  }, [])

  return (
    <div ref={containerRef}>
      {doc.children.map((l, i) => (
        <ELine key={i} line={l} lineIdx={i} />
      ))}
    </div>
  )
}
