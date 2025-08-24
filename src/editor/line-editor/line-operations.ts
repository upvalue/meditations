// line-operations.ts - line operations and key bindings
import { keymap, EditorView } from '@codemirror/view'
import { EditorSelection } from '@codemirror/state'
import { docAtom, requestFocusLineAtom, focusedLineAtom } from '../state'
import { lineMake, type ZDoc } from '../schema'
import { keybindings } from '@/lib/keys'
import type { LineWithIdx } from '../line-editor'
import type { useStore } from 'jotai'

export const toggleCollapse = (store: ReturnType<typeof useStore>, lineInfo: LineWithIdx) => {
  const setDoc = (updater: (draft: ZDoc) => void) => store.set(docAtom, updater)
  const doc = store.get(docAtom)

  const nextLine = doc.children[lineInfo.lineIdx + 1]
  if (!nextLine || nextLine.indent <= doc.children[lineInfo.lineIdx].indent) {
    return false
  }
  
  setDoc((draft: ZDoc) => {
    if (draft.children[lineInfo.lineIdx].collapsed) {
      delete draft.children[lineInfo.lineIdx].collapsed
    } else {
      draft.children[lineInfo.lineIdx].collapsed = true
    }
  })

  return true
}

export const makeKeymap = (store: ReturnType<typeof useStore>, lineInfo: LineWithIdx) => {
  let doc = store.get(docAtom)
  const unsubscribe = store.sub(docAtom, () => {
    doc = store.get(docAtom)
  })
  
  const setDoc = (updater: (draft: ZDoc) => void) => store.set(docAtom, updater)
  const setRequestFocusLine = (value: { lineIdx: number; pos: number }) => store.set(requestFocusLineAtom, value)

  const deleteLineIfEmpty = (view: EditorView) => {
    const { state } = view
    const { selection } = state
    const { ranges } = selection

    if (ranges.length === 0) return false

    const r = ranges[0]

    if (r.from === 0 && r.to === 0) {
      
      if (lineInfo.lineIdx === 0) {
        if (doc.children.length === 1) {
          return false
        }

        setRequestFocusLine({
          lineIdx: lineInfo.lineIdx,
          pos: 0,
        })

        setDoc((draft: ZDoc) => {
          draft.children = draft.children.slice(1)
        })
        return true
      }

      const prevLine = doc.children[lineInfo.lineIdx - 1]

      const endOfPrevLine = prevLine.mdContent.length

      setRequestFocusLine({
        lineIdx: lineInfo.lineIdx - 1,
        pos: endOfPrevLine,
      })

      setDoc((draft: ZDoc) => {
        draft.children[lineInfo.lineIdx - 1].mdContent = prevLine.mdContent.concat(
          state.doc.slice(0, state.doc.length).toString()
        )

        draft.children.splice(lineInfo.lineIdx, 1)
      })
      return true
    }

    return false
  }

  const keymapExtension = keymap.of([
    {
      key: 'Tab',
      run: () => {
        if (lineInfo.lineIdx === 0) return false
        if (lineInfo.lineIdx > 0 && lineInfo.line.indent > doc.children[lineInfo.lineIdx - 1].indent) {
          return false
        }

        setDoc((draft: ZDoc) => {
          draft.children[lineInfo.lineIdx].indent += 1
          draft.children[lineInfo.lineIdx].timeUpdated = new Date().toISOString()
        })
        return true
      },
    },
    {
      key: 'Enter',
      run: (view) => {
        const { state } = view
        const { selection } = state

        const docEnd = state.doc.length
        const currentLineContent = state.doc.toString()

        if (currentLineContent.trim() === '' && lineInfo.line.indent > 0) {
          setDoc((draft: ZDoc) => {
            draft.children[lineInfo.lineIdx].indent = Math.max(0, lineInfo.line.indent - 1)
          })
          return true
        }

        let newLine = ''

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

        console.log('After line addition, setting focus line to', lineInfo.lineIdx + 1)
        setRequestFocusLine({
          lineIdx: lineInfo.lineIdx + 1,
          pos: 0,
        })
        setDoc((draft: ZDoc) => {
          const newLineObj = {
            ...lineMake(lineInfo.line.indent),
            mdContent: newLine,
          }
          if (draft.children[lineInfo.lineIdx].collapsed) {
            delete draft.children[lineInfo.lineIdx].collapsed
          }
          draft.children.splice(lineInfo.lineIdx + 1, 0, newLineObj)
        })

        return true
      },
    },
    {
      key: 'Shift-Tab',
      run: () => {
        if (lineInfo.line.indent === 0) {
          return false
        }
        setDoc((draft: ZDoc) => {
          draft.children[lineInfo.lineIdx].indent -= 1
        })
        return true
      },
    },
    {
      key: 'Backspace',
      run: (view) => deleteLineIfEmpty(view),
    },
    {
      key: 'ArrowUp',
      run: (view) => {
        const cursorPos = view.state.selection.main.head

        if (lineInfo.lineIdx === 0) return false

        const prevLine = doc.children[lineInfo.lineIdx - 1]

        console.log('Set focus line to', lineInfo.lineIdx - 1)
        setRequestFocusLine({
          lineIdx: lineInfo.lineIdx - 1,
          pos: Math.min(cursorPos, prevLine.mdContent.length),
        })

        return true
      },
    },
    {
      key: 'ArrowDown',
      run: (view) => {
        const cursorPos = view.state.selection.main.head

        if (lineInfo.lineIdx >= doc.children.length - 1) return false

        const nextLine = doc.children[lineInfo.lineIdx + 1]

        setRequestFocusLine({
          lineIdx: lineInfo.lineIdx + 1,
          pos: Math.min(cursorPos, nextLine.mdContent.length),
        })

        return true
      },
    },
    {
      key: 'Mod-Backspace',
      run: (view) => deleteLineIfEmpty(view),
    },
    {
      key: keybindings.toggleCollapse.key,
      run: () => toggleCollapse(store, lineInfo),
    },
    {
      key: 'Alt-Backspace',
      run: (view) => deleteLineIfEmpty(view),
    },
  ])

  return {
    keymap: keymapExtension,
    cleanup: unsubscribe
  }
}