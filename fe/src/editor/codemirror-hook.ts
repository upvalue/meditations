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
import { tagPattern, type ZLine } from './schema'
import { useAtom } from 'jotai'
import { docAtom, docIterationAtom, focusLineAtom } from './state'
import { produce } from 'immer'
import { autocompletion } from '@codemirror/autocomplete'
import { CompletionContext } from '@codemirror/autocomplete'

const theme = EditorView.theme(
  {
    '.cm-line': {
      '@apply': 'flex',
    },
  },
  { dark: true }
)

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

function slashCommands(context: CompletionContext) {
  let word = context.matchBefore(/\w*/)
  if (word.from == word.to && !context.explicit) return null
  return {
    from: word.from,
    options: [
      {
        // TODO: Needs a different label
        // TODO: Styling
        label: '/date: Insert current date',
        type: 'text',
        apply: (view, completion, from, to) => {
          // Get YYYY-MM-DD date
          const date = new Date().toISOString().split('T')[0]

          view.dispatch({
            changes: {
              from,
              to,
              insert: date,
            },
          })
          // TODO: Needs to add the pickedCompletion annotation
        },
      },
      // { label: 'match', type: 'keyword' },
      // { label: 'hello', type: 'variable', info: '(World)' },
      // { label: 'magic', type: 'text', apply: '⠁⭒*.✩.*⭒⠁', detail: 'macro' },
    ],
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
  const [, setFocusLine] = useAtom(focusLineAtom)

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
        autocompletion({
          override: [slashCommands],
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

          setDoc((recentDoc) =>
            produce(recentDoc, (draft) => {
              // Append content after backspace to previous line
              draft.children[lineIdx - 1].mdContent = prevLine.mdContent.concat(
                state.doc.slice(0, state.doc.length).toString()
              )

              // Remove current line from line array
              draft.children.splice(lineIdx, 1)
            })
          )
        }

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

        console.log('After line addition, setting focus line to', lineIdx + 1)
        setFocusLine({
          lineIdx: lineIdx + 1,
          pos: 0,
        })
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
    }
  }, [lineInfo])

  useEffect(makeEditor, [])

  return {
    cmCallbacks,
    cmRef,
    cmView,
  }
}
