// line-editor.ts - Meat of the actual editor implementation
// Wraps Codemirror with lots of custom behavior
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
import {
  EditorSelection,
  EditorState,
  RangeSetBuilder,
} from '@codemirror/state'
import { tagPattern, lineMake, type ZLine } from './schema'
import { useAtom } from 'jotai'
import { docAtom, focusLineAtom } from './state'
import { autocompletion, type Completion } from '@codemirror/autocomplete'
import { CompletionContext } from '@codemirror/autocomplete'
import { TypedEventEmitter, useEventListener } from '@/lib/events'

const theme = EditorView.theme({}, { dark: true })

// Define specific event types for codemirror communication
export type TagClickEventDetail = {
  name: string
}

export type WikiLinkClickEventDetail = {
  link: string
}

export type LineStatusEvent = {
  lineIdx: number
}

export type LineTimerEvent = {
  lineIdx: number
}

// Combined event interface for the codemirror emitter
type CodemirrorEvents = {
  tagClick: TagClickEventDetail
  wikiLinkClick: WikiLinkClickEventDetail
  lineTimerAdd: LineTimerEvent;
  lineTagToggle: LineStatusEvent;
};

// Singleton emitter for codemirror events
const codemirrorEmitter = new TypedEventEmitter<CodemirrorEvents>();

// Expose emitter globally for decoration string handlers
declare global {
  interface Window {
    __codemirrorEmitter: TypedEventEmitter<CodemirrorEvents>
  };
}
window.__codemirrorEmitter = codemirrorEmitter;

// Convenience hooks
export const useCodemirrorEvent = <K extends keyof CodemirrorEvents>(
  event: K,
  handler: CodemirrorEvents[K] extends undefined
    ? () => void
    : (data: CodemirrorEvents[K]) => void,
) => {
  useEventListener(codemirrorEmitter, event, handler);
}

export const emitCodemirrorEvent = <K extends keyof CodemirrorEvents>(
  event: K,
  ...args: CodemirrorEvents[K] extends undefined ? [] : [data: CodemirrorEvents[K]]
) => {
  codemirrorEmitter.emit(event, ...args)
}

// Helper for line-specific events that include lineIdx
type LineSpecificEvents = {
  [K in keyof CodemirrorEvents]: CodemirrorEvents[K] extends { lineIdx: number } ? K : never
}[keyof CodemirrorEvents]

export const useLineEvent = <K extends LineSpecificEvents>(
  event: K,
  lineIdx: number,
  handler: (data: CodemirrorEvents[K]) => void
) => {
  useCodemirrorEvent(event, (data) => {
    if ((data as any).lineIdx !== lineIdx) {
      return
    }
    handler(data)
  })
}

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

  // Editor state callbacks
  contentUpdated: (content: string) => void
}

const makeTagDecoration = (tag: string) => {
  return Decoration.mark({
    class: 'cm-tag cursor-pointer',
    tagName: 'span',
    attributes: {
      'data-name': tag,
      onClick: `window.__codemirrorEmitter.emit('tagClick', { name: "${tag}" })`,
    },
  })
}

const wikiLinkPattern = /\[\[(.*?)\]\]/g

const makeWikiLinkDecoration = (link: string) => {
  const linkText = link.slice(2, -2)
  return Decoration.mark({
    class: 'cm-wiki-link',
    tagName: 'span',
    attributes: {
      'data-link': linkText,
      onClick: `window.__codemirrorEmitter.emit('wikiLinkClick', { link: "${linkText}" })`,
    },
  })
}

const wikiLinkPlugin = ViewPlugin.fromClass(
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

        wikiLinkPattern.lastIndex = 0
        while ((match = wikiLinkPattern.exec(text)) !== null) {
          const start = from + match.index
          const end = start + match[0].length
          console.log('add decoration for', match[0])
          builder.add(start, end, makeWikiLinkDecoration(match[0]))
        }
      }

      return builder.finish()
    }
  },
  {
    decorations: (value) => value.decorations,
  }
)

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

// TODO: Styling
const slashCommands = (lineIdx: number) => {
  return (context: CompletionContext) => {
    // Check for words beginning with a slash
    let word = context.matchBefore(/\/\w*/)
    if (!word) return null
    if (word.from == word.to && !context.explicit) return null
    return {
      from: word.from,
      options: [
        {
          label: '/date: Insert current date',
          type: 'text',
          apply: (
            view: EditorView,
            _completion: Completion,
            from: number,
            to: number
          ) => {
            // Get YYYY-MM-DD date
            const date = new Date().toISOString().split('T')[0]

            view.dispatch({
              changes: {
                from,
                to,
                insert: date,
              },
            })
          },
        },
        {
          label: '/timer: Add a timer to the line',
          type: 'text',
          apply: (
            view: EditorView,
            _completion: Completion,
            from: number,
            to: number
          ) => {
            emitCodemirrorEvent('lineTimerAdd', {
              lineIdx,
            })

            // Erase autocompleted text
            view.dispatch({
              changes: {
                from,
                to,
                insert: '',
              },
            })
          },
        },
        {
          label: '/task: Toggle whether line is a task',
          type: 'text',
          apply: (
            view: EditorView,
            _completion: Completion,
            from: number,
            to: number
          ) => {
            emitCodemirrorEvent('lineTagToggle', {
              lineIdx,
            })

            // Erase autocompleted text
            view.dispatch({
              changes: {
                from,
                to,
                insert: '',
              },
            })
          },
        },
      ],
    }
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
    contentUpdated: () => {},
  })
  const cmRef = useRef<HTMLDivElement>(null)
  const cmView = useRef<EditorView | null>(null)
  const [doc, setDoc] = useAtom(docAtom)
  const [focusLine, setFocusLine] = useAtom(focusLineAtom)

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

    const state = EditorState.create({
      doc: lineInfo.line.mdContent,
      extensions: [
        theme,
        updateListener,
        customKeymap,
        keymap.of(emacsStyleKeymap),
        EditorView.lineWrapping,
        tagPlugin,
        wikiLinkPlugin,
        autocompletion({
          override: [slashCommands(lineInfo.lineIdx)],
        }),
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

      // Enter and backspace (line creation and deletion)
      Backspace: () => {
        const view = cmView.current

        if (!view) return false

        // Check that we are at the beginning of a line
        const { state } = view
        const { selection } = state
        const { ranges } = selection

        if (ranges.length === 0) return false

        const r = ranges[0]

        if (r.from === 0 && r.to === 0) {
          // Won't delete the first line (for now)
          if (lineIdx === 0) return false

          const prevLine = doc.children[lineIdx - 1]

          const endOfPrevLine = prevLine.mdContent.length

          setFocusLine({
            lineIdx: lineIdx - 1,
            pos: endOfPrevLine,
          })

          setDoc((draft) => {
            // Append content after backspace to previous line
            draft.children[lineIdx - 1].mdContent = prevLine.mdContent.concat(
              state.doc.slice(0, state.doc.length).toString()
            )

            console.log(
              'New line content ',
              draft.children[lineIdx - 1].mdContent
            )

            // Remove current line from line array
            draft.children.splice(lineIdx, 1)
          })
          return true
        }

        return false
      },

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
        setFocusLine({
          lineIdx: lineIdx + 1,
          pos: 0,
        })
        setDoc((draft) => {
          const newLineObj = {
            ...lineMake(line.indent),
            mdContent: newLine,
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
        setFocusLine({
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
        setFocusLine({
          lineIdx: lineIdx + 1,
          pos: Math.min(cursorPos, nextLine.mdContent.length),
        })

        return true
      },

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

    if (focusLine.lineIdx !== lineIdx) {
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
        selection: EditorSelection.cursor(focusLine.pos),
        scrollIntoView: true,
      })

      // Clear line focus status
      setFocusLine({
        lineIdx: -1,
        pos: 0,
      })
    }

    obtainFocus()
  }, [focusLine, lineInfo, cmView.current])

  useEffect(makeEditor, [])

  useLineEvent(
    'lineTimerAdd',
    lineInfo.lineIdx,
    (event) => {
      // If it's already got a time, don't do anything
      if (lineInfo.line.datumTime) {
        return
      }
      setDoc((draft) => {
        draft.children[event.lineIdx].datumTime = 0
      })
    }
  )

  useLineEvent(
    'lineTagToggle',
    lineInfo.lineIdx,
    (event) => {
      setDoc((draft) => {
        if (draft.children[event.lineIdx].datumTaskStatus) {
          delete draft.children[event.lineIdx].datumTaskStatus
        } else {
          draft.children[event.lineIdx].datumTaskStatus = 'unset'
        }
      })

      console.log('Tag toggle event', event.lineIdx)
    }
  )

  return {
    cmCallbacks,
    cmRef,
    cmView,
  }
}
