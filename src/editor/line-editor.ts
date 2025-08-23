// line-editor.ts - Meat of the actual editor implementation
// Wraps Codemirror with lots of custom behavior
import { useEffect, useRef } from 'react'

import { EditorView, keymap} from '@codemirror/view'
import { emacsStyleKeymap } from '@codemirror/commands'
import { EditorSelection, EditorState, type Extension } from '@codemirror/state'
import { lineMake, type ZLine } from './schema'
import { useAtom, useSetAtom, useStore } from 'jotai'
import { docAtom, focusedLineAtom, requestFocusLineAtom } from './state'
import { autocompletion } from '@codemirror/autocomplete'
import { keybindings } from '@/lib/keys'
import { useLineEvent } from './line-editor/cm-events'
import { wikiLinkPlugin } from './line-editor/wiki-link-plugin'
import { tagPlugin } from './line-editor/tag-plugin'
import { slashCommandsPlugin } from './line-editor/slash-commands-plugin'
import { placeholder } from './line-editor/placeholder-plugin'

const theme = EditorView.theme(
  // Preferring to do these in TEditor.css
  // but due to the css-in-js approach in some cases
  // it's challenging
  {
    '.cm-completionIcon': {
      display: 'none',
    },
    '.cm-line': {
      padding: '0',
    },
    '.cm-focused': {
      outline: 'none',
    },
  },
  { dark: true }
)

export { useCodemirrorEvent, useLineEvent } from './line-editor/cm-events'

/**
 * Line with its index. Handy for being able to
 * change the document without knowing its structure:
 */
export type LineWithIdx = {
  line: ZLine
  lineIdx: number
}

export type CallbackTable = {
  // Keymap callbacks
  Enter: () => boolean
  'Shift-Tab': () => boolean
  Tab: () => boolean
  Backspace: () => boolean
  ArrowUp: () => boolean
  ArrowDown: () => boolean
  Collapse: () => boolean
  'Mod-Backspace': () => boolean
  'Alt-Backspace': () => boolean
  // Editor state callbacks
  contentUpdated: (content: string) => void
}

const useLineOperations = (
  cmView: React.RefObject<EditorView | null>,
  lineIdx: number
) => {
  const [doc, setDoc] = useAtom(docAtom)
  const setRequestFocusLine = useSetAtom(requestFocusLineAtom)

  const deleteLineIfEmpty = () => {
    const view = cmView.current
    if (!view) return false

    const { state } = view
    const { selection } = state
    const { ranges } = selection

    if (ranges.length === 0) return false

    const r = ranges[0]

    if (r.from === 0 && r.to === 0) {
      // If deleting the first line, we'll refuse if
      // there are no other lines, otherwise we go to
      // the first char of next line
      if (lineIdx === 0) {
        if (doc.children.length === 1) {
          return false
        }

        setRequestFocusLine({
          lineIdx: lineIdx,
          pos: 0,
        })

        setDoc((draft) => {
          draft.children = draft.children.slice(1)
        })
        return true
      }

      const prevLine = doc.children[lineIdx - 1]

      console.log(doc, prevLine, lineIdx)

      const endOfPrevLine = prevLine.mdContent.length

      setRequestFocusLine({
        lineIdx: lineIdx - 1,
        pos: endOfPrevLine,
      })

      setDoc((draft) => {
        // Append content after backspace to previous line
        draft.children[lineIdx - 1].mdContent = prevLine.mdContent.concat(
          state.doc.slice(0, state.doc.length).toString()
        )

        // Remove current line from line array
        draft.children.splice(lineIdx, 1)
      })
      return true
    }

    return false
  }

  const toggleCollapse = () => {
    // If a line has no indented lines after it, it's not eligible
    // to be collapsed
    const nextLine = doc.children[lineIdx + 1]
    if (!nextLine || nextLine.indent <= doc.children[lineIdx].indent) {
      return false
    }

    setDoc((draft) => {
      if (draft.children[lineIdx].collapsed) {
        delete draft.children[lineIdx].collapsed
      } else {
        draft.children[lineIdx].collapsed = true
      }
    })

    return true
  }
  return {
    deleteLineIfEmpty,
    toggleCollapse,
  }
}

/**
 * Sets up a Codemirror editor
 *
 * How the Codemirror integration works currently.
 *
 * The hook returns a ref which the component for the actual line
 * gives to the div where Codemirror will be set up.
 *
 * On hook mount, a Codemirror view is set up with the markdown content of the line
 *
 * Within the hook, a "callbacks" ref is updated when the document changes.
 * This is because callbacks will need to update document state. (It's possible
 * that some of this can be done away now with thanks to the setState callback)
 *
 * There's bidirectional synchronization of codemirror view and document state;
 * updates to codemirror update the document, and updates to the document update
 * codemirror (if there are any changes). This is because lines can alter the state
 * of other lines (for example, if a line is deleted via backspace, the content of that
 * line is spliced onto the previous line). This probably shouldn't work... but it seems
 * to work fine.
 *
 * It's probable that https://github.com/uiwjs/react-codemirror should be used
 * instead of this hand rolled thing, but I wanted to use vanilla codemirror because
 * various prosemirror wrappers became very confusing.
 */
export const useCodeMirror = (lineInfo: LineWithIdx) => {
  const cmCallbacks = useRef<CallbackTable>({
    Enter: () => false,
    'Shift-Tab': () => false,
    Tab: () => false,
    Backspace: () => false,
    ArrowUp: () => false,
    ArrowDown: () => false,
    Collapse: () => false,
    'Mod-Backspace': () => false,
    'Alt-Backspace': () => false,
    contentUpdated: () => {},
  })
  const cmRef = useRef<HTMLDivElement>(null)
  const cmView = useRef<EditorView | null>(null)
  const [doc, setDoc] = useAtom(docAtom)
  const [requestFocusLine, setRequestFocusLine] = useAtom(requestFocusLineAtom)
  const setFocusedLine = useSetAtom(focusedLineAtom)
  const store = useStore();

  const lineOps = useLineOperations(cmView, lineInfo.lineIdx)

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
      {
        key: 'ArrowUp',
        run: () => cmCallbacks.current.ArrowUp() ?? false,
      },
      {
        key: 'ArrowDown',
        run: () => cmCallbacks.current.ArrowDown() ?? false,
      },
      {
        key: 'Mod-Backspace',
        run: () => cmCallbacks.current['Mod-Backspace']() ?? false,
      },
      {
        key: keybindings.toggleCollapse.key,
        run: () => cmCallbacks.current['Collapse']() ?? false,
      },
      {
        key: 'Alt-Backspace',
        run: () => cmCallbacks.current['Alt-Backspace']() ?? false,
      },
    ])

    const updateListener = EditorView.updateListener.of((update) => {
      // console.log({ update })
      if (!update.docChanged) {
        return
      }

      if (cmCallbacks.current && cmCallbacks.current.contentUpdated) {
        cmCallbacks.current.contentUpdated(update.state.doc.toString())
      }
    })

    const focusListener = EditorView.updateListener.of((update) => {
      if (!update.focusChanged) return
      if (update.view.hasFocus) {
        setFocusedLine(lineInfo.lineIdx)
      }
    })

    const placeholderPlugin = placeholder('The world is your canvas', (view) => {
      if(lineInfo.lineIdx === 1) {
        return true;
      }
      if(view.state.doc.length > 0) return false;
      if(lineInfo.lineIdx !== 0) return false;
      if(store.get(docAtom).children.length === 1) return true;
      return false;
    });

    const extensions: Extension[] = [
      theme,
      updateListener,
      focusListener,
      customKeymap,
      keymap.of(emacsStyleKeymap),
      EditorView.lineWrapping,
      tagPlugin,
      wikiLinkPlugin,
       placeholderPlugin,
      autocompletion({
        override: [slashCommandsPlugin(lineInfo.lineIdx)],
      }),
    ];

    const state = EditorState.create({
      doc: lineInfo.line.mdContent,
      extensions,
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

        setDoc((draft) => {
          draft.children[lineIdx].indent += 1
          draft.children[lineIdx].timeUpdated = new Date().toISOString()
        })
        return true
      },

      'Shift-Tab': () => {
        if (line.indent === 0) {
          return false
        }
        setDoc((draft) => {
          draft.children[lineIdx].indent -= 1
        })
        return true
      },

      'Mod-Backspace': lineOps.deleteLineIfEmpty,

      'Alt-Backspace': lineOps.deleteLineIfEmpty,

      // Enter and backspace (line creation and deletion)
      Backspace: lineOps.deleteLineIfEmpty,

      Enter: () => {
        // console.log('enter called along with line ', lineInfo)
        const view = cmView.current

        if (!view) return false

        const { state } = view
        const { selection } = state

        const docEnd = state.doc.length
        const currentLineContent = state.doc.toString()

        // Check if the current line is empty and has indentation
        if (currentLineContent.trim() === '' && line.indent > 0) {
          // De-dent the current line instead of creating a new one
          setDoc((draft) => {
            draft.children[lineIdx].indent = Math.max(0, line.indent - 1)
          })
          return true
        }

        let newLine = ''

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

        console.log('After line addition, setting focus line to', lineIdx + 1)
        setRequestFocusLine({
          lineIdx: lineIdx + 1,
          pos: 0,
        })
        setDoc((draft) => {
          const newLineObj = {
            ...lineMake(line.indent),
            mdContent: newLine,
          }
          if (draft.children[lineIdx].collapsed) {
            delete draft.children[lineIdx].collapsed
          }
          draft.children.splice(lineIdx + 1, 0, newLineObj)
        })

        return true
      },

      ArrowUp: () => {
        const view = cmView.current
        if (!view) return false

        // Get current cursor position
        const cursorPos = view.state.selection.main.head

        // Check if we can navigate up (not at first line)
        if (lineIdx === 0) return false

        const prevLine = doc.children[lineIdx - 1]

        // Focus on previous line at same cursor position
        setRequestFocusLine({
          lineIdx: lineIdx - 1,
          pos: Math.min(cursorPos, prevLine.mdContent.length),
        })

        return true
      },

      ArrowDown: () => {
        const view = cmView.current
        if (!view) return false

        // Get current cursor position
        const cursorPos = view.state.selection.main.head

        // Check if we can navigate down (not at last line)
        if (lineIdx >= doc.children.length - 1) return false

        const nextLine = doc.children[lineIdx + 1]

        // Focus on next line at same cursor position
        setRequestFocusLine({
          lineIdx: lineIdx + 1,
          pos: Math.min(cursorPos, nextLine.mdContent.length),
        })

        return true
      },

      Collapse: () => lineOps.toggleCollapse(),

      contentUpdated: (content: string) => {
        console.log('Line', lineIdx, 'content updated', content)
        setDoc((draft) => {
          draft.children[lineIdx].mdContent = content
          draft.children[lineIdx].timeUpdated = new Date().toISOString()
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
    }
  }, [lineInfo])

  /**
   * Focus management.
   *
   * Lines can request focus on a specific line / position due to
   * line editing operations. This effect determines when that's happened,
   * loops until Codemirror is ready to handle it, and then does so
   */
  useEffect(() => {
    const { lineIdx } = lineInfo

    if (requestFocusLine.lineIdx !== lineIdx) {
      return
    }

    console.log('Focus requested on line ', lineIdx, ' view ', cmView.current)

    const obtainFocus = () => {
      const view = cmView.current

      if (!view) {
        console.log('Focus: View not defined, returning early')
        setTimeout(obtainFocus, 10)
        return
      }

      view.focus()
      view.dispatch({
        selection: EditorSelection.cursor(requestFocusLine.pos),
        scrollIntoView: true,
      })

      // Clear line focus status
      setRequestFocusLine({
        lineIdx: -1,
        pos: 0,
      })
    }

    obtainFocus()
  }, [requestFocusLine, lineInfo, cmView.current])

  useEffect(makeEditor, [])

  useLineEvent('lineTimerAdd', lineInfo.lineIdx, (event) => {
    // If it's already got a time, don't do anything
    if (lineInfo.line.datumTime) {
      return
    }
    setDoc((draft) => {
      draft.children[event.lineIdx].datumTime = 0
    })
  })

  useLineEvent('lineTagToggle', lineInfo.lineIdx, (event) => {
    setDoc((draft) => {
      if (draft.children[event.lineIdx].datumTaskStatus) {
        delete draft.children[event.lineIdx].datumTaskStatus
      } else {
        draft.children[event.lineIdx].datumTaskStatus = 'unset'
      }
    })

    console.log('Tag toggle event', event.lineIdx)
  })

  useLineEvent('lineCollapseToggle', lineInfo.lineIdx, (event) => {
    lineOps.toggleCollapse()
  })

  return {
    cmCallbacks,
    cmRef,
    cmView,
  }
}
