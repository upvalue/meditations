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
import { useCodeMirror, type LineInfo } from './codemirror-hook'

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

const ELine = (lineInfo: LineInfo) => {
  const { cmRef, cmView } = useCodeMirror(lineInfo)

  // Codemirror of course doesn't receive recreated
  // callbacks with new component state; this table
  // lets us update them on the fly

  const [doc, setDoc] = useAtom(docAtom)

  const { line, lineIdx } = lineInfo

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
