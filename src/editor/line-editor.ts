// line-editor.ts - Meat of the actual editor implementation
// Wraps Codemirror with lots of custom behavior
import { useCallback, useEffect, useRef } from 'react'

import { EditorView, keymap} from '@codemirror/view'
import { emacsStyleKeymap } from '@codemirror/commands'
import { EditorSelection, EditorState, type Extension } from '@codemirror/state'
import { lineMake, type ZLine } from './schema'
import { useAtom, useSetAtom, useStore } from 'jotai'
import { docAtom, focusedLineAtom, requestFocusLineAtom } from './state'
import { autocompletion } from '@codemirror/autocomplete'
import { useLineEvent } from './line-editor/cm-events'
import { wikiLinkPlugin } from './line-editor/wiki-link-plugin'
import { tagPlugin } from './line-editor/tag-plugin'
import { slashCommandsPlugin } from './line-editor/slash-commands-plugin'
import { placeholder } from './line-editor/placeholder-plugin'
import { makeKeymap, toggleCollapse } from './line-editor/line-operations'

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
  const cmRef = useRef<HTMLDivElement>(null)
  const cmView = useRef<EditorView | null>(null)
  const [, setDoc] = useAtom(docAtom)
  const [requestFocusLine, setRequestFocusLine] = useAtom(requestFocusLineAtom)
  const setFocusedLine = useSetAtom(focusedLineAtom)
  const store = useStore()

  const makeEditor = () => {
    const { keymap: customKeymap, cleanup: cleanupKeymap } = makeKeymap(store, lineInfo)

    const updateListener = EditorView.updateListener.of((update) => {
      if (!update.docChanged) {
        return
      }

      console.log('Line', lineInfo.lineIdx, 'content updated', update.state.doc.toString())
      setDoc((draft) => {
        draft.children[lineInfo.lineIdx].mdContent = update.state.doc.toString()
        draft.children[lineInfo.lineIdx].timeUpdated = new Date().toISOString()
      })
    })

    const focusListener = EditorView.updateListener.of((update) => {
      if (!update.focusChanged) return
      if (update.view.hasFocus) {
        setFocusedLine(lineInfo.lineIdx)
      }
    })

    const placeholderPlugin = placeholder('The world is your canvas', (view) => {
      if(view.state.doc.length > 0) return false;
      if(lineInfo.lineIdx !== 0) return false;
      if(store.get(docAtom).children.length === 1) return false;
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
      cleanupKeymap()
      view.destroy()
    }
  }

  useEffect(() => {
    if (!cmView.current) return
    const { line } = lineInfo
    
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
    toggleCollapse(store, lineInfo)
  })

  return {
    cmRef,
    cmView,
  }
}
