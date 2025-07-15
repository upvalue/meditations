import { useEditor, EditorContent } from '@tiptap/react'
import { mergeAttributes, Node } from '@tiptap/core'
import { TextSelection } from '@tiptap/pm/state'

/**
 * The editor; this editor is an outline editor
 * implemented with Tiptap that allows the user to
 * edit Lines which are rendered as a list.
 */

const TDoc = Node.create({
  name: 'doc',
  topNode: true,
  content: 'line+',
})

/**
 * Line nodes can contain both text
 * and other outline nodes; as ProseMirror
 * doesn't want us to mix inline and
 * block content, this is a block purely
 * to contain the text of an outline node
 */
const LineText = Node.create({
  name: 'line_text',
  group: 'block',
  content: 'inline*',

  parseHTML() {
    return [{ tag: 'span.line-text' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { class: 'line-text' }), 0]
  },
})

const Line = Node.create({
  name: 'line',
  group: 'block',
  // Contains text and any amount of line_nodes
  content: 'line_text line*',
  //
  isolating: true,

  parseHTML() {
    return [{ tag: 'div.line' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(
        {
          class: 'line-node',
        },
        HTMLAttributes
      ),
      0,
    ]
  },

  addKeyboardShortcuts() {
    return {
      // Enter creates a new line at the same level below
      Enter: () => {
        return this.editor.commands.command(({ state, dispatch }) => {
          const { $from } = state.selection
          const { line, line_text } = state.schema.nodes

          // Find the position after the current line node
          let $pos = $from

          // Navigate up to find the line node
          for (let d = $pos.depth; d >= 0; d--) {
            if ($pos.node(d).type.name === 'line') {
              $pos = state.doc.resolve($pos.after(d))
              break
            }
          }

          // Create a new line node with an empty line_text node
          const newLineText = line_text.create()
          const newLine = line.create(null, newLineText)

          // Insert the new line node
          const tr = state.tr.insert($pos.pos, newLine)

          // Move cursor to the beginning of the new line
          const newPos = $pos.pos + 2 // +1 for line node, +1 for line_text node
          tr.setSelection(TextSelection.near(tr.doc.resolve(newPos)))

          if (dispatch) {
            dispatch(tr)
          }

          return true
        })
      },
    }
  },
})

const Text = Node.create({
  name: 'text',
  group: 'inline',
})

const extensions = [TDoc, Line, LineText, Text]

const content = `
<div class="line">
  <span class="line-text">Let's make a line node!</span>
</div>
`

export const TekneEditor = () => {
  const editor = useEditor({
    extensions,
    content,
    editorProps: {
      attributes: {
        class: 'h-full w-full p-4',
      },
    },
    onUpdate: ({ editor }) => {
      console.log('Document changed:', editor.getJSON())
    },
  })

  return (
    <div className="editor-container h-full w-full p-8">
      <EditorContent editor={editor} />
    </div>
  )
}
