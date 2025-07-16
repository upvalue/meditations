import { useEffect, useRef } from 'react'

import {
  EditorView,
  keymap,
  Decoration,
  ViewPlugin,
  ViewUpdate,
  WidgetType,
} from '@codemirror/view'
import type { DecorationSet } from '@codemirror/view'
import { defaultKeymap, emacsStyleKeymap } from '@codemirror/commands'
import { history, historyKeymap } from '@codemirror/commands'

import './CMEditor.css'
import {
  EditorSelection,
  EditorState,
  type ChangeSpec,
} from '@codemirror/state'

// Theme for full-screen styling
const outlineTheme = EditorView.theme({
  '&': {
    height: '100vh',
    fontSize: '16px',
  },
  '.cm-content': {
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  '.cm-line': {
    lineHeight: '1.8',
  },
  '.cm-bullet': {
    display: 'inline-block',
    marginLeft: '-20px',
    width: '20px',
  },
  '.cm-scroller': {
    fontFamily: 'inherit',
  },
})

const outlinePlugin = EditorState.transactionFilter.of((tr) => {
  if (!tr.docChanged) return tr

  console.log('outlinePlugin called with a change')
  let changes: ChangeSpec[] = []

  /*
  console.log(JSON.stringify(tr.newDoc.toString()))
  let from = 0
  const iter = tr.newDoc.iter()
  while (!iter.done) {
    const line = iter.value

    if (line === '') {
      iter.next()
      continue
    }

    if (iter.lineBreak) {
      from += 1
      iter.next()
      continue
    }

    console.log('line', line)

    if (!line.startsWith('- ')) {
      console.log('line', line, 'does not start with hypen', from)
      changes.push({ from, insert: '- ' })
    }
    from += line.length

    // console.log(`iter "${iter.line}"`)
    iter.next()
  }
    */

  for (let i = 1; i != tr.newDoc.lines + 1; i++) {
    const line = tr.newDoc.line(i)

    console.log('line', line.text)
    if (!line.text.startsWith('- ')) {
      const from = Math.min(line.from, tr.newDoc.length - 1)
      // Instead of inserting, you need to "edit" the existing line as user can backspace into it
      // Cursor here is brittle because it assumes cursor is at end of the document
      changes.push({ from, insert: '- ' })
    }
  }

  return changes.length > 0
    ? [tr, { changes, selection: EditorSelection.single(tr.newDoc.length + 1) }]
    : tr
})

export const CMEditor = () => {
  const elt = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (elt.current) {
      const startDoc = '- test'

      const view = new EditorView({
        doc: startDoc,
        parent: elt.current,
        extensions: [
          // bulletPlugin,
          // outlineKeymap,
          keymap.of(emacsStyleKeymap),
          keymap.of(historyKeymap),
          history(),
          outlineTheme,
          EditorView.lineWrapping,
          outlinePlugin,
        ],
      })

      return () => {
        view.destroy()
      }
    }
  }, [])

  return (
    <div className="cm-editor-container h-min-full w-full p-8" ref={elt}></div>
  )
}
