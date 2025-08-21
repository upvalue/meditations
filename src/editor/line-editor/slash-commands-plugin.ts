import { EditorView } from '@codemirror/view'
import { type Completion, CompletionContext } from '@codemirror/autocomplete'
import { emitCodemirrorEvent } from './cm-events'

export const slashCommandsPlugin = (lineIdx: number) => {
  return (context: CompletionContext) => {
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
