import React, { useState, useEffect, useRef, useLayoutEffect } from 'react'
import type { ZDoc, ZLine } from './Editor4Schema'
// import { EditorView, EditorState, basicSetup } from '@codemirror/basic-setup'

import { EditorView, keymap } from '@codemirror/view'
import { emacsStyleKeymap } from '@codemirror/commands'
import { EditorState } from '@codemirror/state'

import './Editor4.css'
import { Icon } from '@/Icon'
import { ListBulletIcon } from '@heroicons/react/20/solid'

import { atom, useAtom } from 'jotai'

import { produce } from 'immer'

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

interface Editor4Props {
  onDocChange: (doc: ZDoc) => void
}

const ELine = ({ line, lineIdx }: { line: ZLine; lineIdx: number }) => {
  const elt = useRef<HTMLDivElement>(null)
  const cmView = useRef<EditorView | null>(null)

  const keymapTable = useRef<{
    [key: string]: () => boolean
  }>({})

  const [doc, setDoc] = useAtom(docAtom)

  useEffect(() => {
    if (elt.current) {
      // TODO: Keymap doesn't update because it's created once right now.
      // Thoughts?
      const customKeymap = keymap.of([
        {
          key: 'Tab',
          run: () => keymapTable.current.Tab() ?? false,
        },
        {
          key: 'Enter',
          run: () => keymapTable.current.Enter() ?? false,
        },
        {
          key: 'Shift-Tab',
          run: () => keymapTable.current['Shift-Tab']() ?? false,
        },
      ])

      const state = EditorState.create({
        doc: line.mdContent,
        extensions: [
          customKeymap, // Add our custom keymap first to take precedence
          keymap.of(emacsStyleKeymap),
          EditorView.lineWrapping,
        ],
      })
      const view = new EditorView({
        state,
        parent: elt.current,
      })

      cmView.current = view

      return () => {
        view.destroy()
      }
    }
  }, [])

  useEffect(() => {
    keymapTable.current = {
      // List sink and lift
      Tab: () => {
        // Don't allow indenting more than one level past previous line
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
        const newDoc = produce(doc, (draft) => {
          draft.children[lineIdx].indent -= 1
        })
        setDoc(newDoc)
        return true
      },

      // Enter and backspace (line creation and deletion)

      Enter: () => {
        const newDoc = produce(doc, (draft) => {
          draft.children.splice(lineIdx + 1, 0, {
            type: 'line',
            mdContent: '',
            indent: line.indent,
          })
        })
        setDoc(newDoc)
        return true
      },
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
      <div className="cm-editor-container w-full" ref={elt} />
    </div>
  )
}

export const Editor4 = ({ onDocChange }: Editor4Props) => {
  const [doc, setDoc] = useAtom(docAtom)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    onDocChange(doc)
  }, [])

  useEffect(() => {
    // Call onDocChange when component mounts and whenever doc changes
    if (onDocChange) {
      onDocChange(doc)
    }
  }, [doc, onDocChange])

  useEffect(() => {
    if (!containerRef.current) return

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          if (mutation.target.classList.contains('cm-content')) {
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
