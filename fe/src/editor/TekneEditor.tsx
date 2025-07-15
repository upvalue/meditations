import { useEditor, EditorContent } from '@tiptap/react'
import {
  defaultBlockAt,
  getSplittedAttributes,
  mergeAttributes,
  Node,
  type RawCommands,
} from '@tiptap/core'
import { EditorState, NodeSelection, TextSelection } from '@tiptap/pm/state'
import { useState } from 'react'
import { findParentNode } from '@tiptap/core'
import { invariant } from '@tanstack/react-router'
import { canSplit } from '@tiptap/pm/transform'

class EditorInvariantError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'EditorInvariantError'
  }
}

function assert(condition: any, message: string): asserts condition {
  try {
    invariant(condition, message)
  } catch {
    throw new EditorInvariantError(message)
  }
}

// Current issue:
//   Enter needs to create a new line node
//   at the same level as current line node
//   This also needs to handle splitting content
//
//   Backspace needs to delete a line node (if at the
//   end of current line node). This also means that
//   children need to be spliced into the existing line
//   node

// Hierarchy: doc -> line -> line_text and line*

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
const LineBody = Node.create({
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

function ensureMarks(state: EditorState, splittableMarks?: string[]) {
  const marks =
    state.storedMarks ||
    (state.selection.$to.parentOffset && state.selection.$from.marks())

  if (marks) {
    const filteredMarks = marks.filter((mark) =>
      splittableMarks?.includes(mark.type.name)
    )

    state.tr.ensureMarks(filteredMarks)
  }
}

export const splitBlock: RawCommands['splitBlock'] =
  ({ keepMarks = true } = {}) =>
  ({ tr, state, dispatch, editor }) => {
    console.log('Meowdy :)')
    const { selection, doc } = tr
    const { $from, $to } = selection
    const extensionAttributes = editor.extensionManager.attributes
    const newAttributes = getSplittedAttributes(
      extensionAttributes,
      $from.node().type.name,
      $from.node().attrs
    )

    if (selection instanceof NodeSelection && selection.node.isBlock) {
      // doesn't trip on empty so far
      if (!$from.parentOffset || !canSplit(doc, $from.pos)) {
        return false
      }

      if (dispatch) {
        if (keepMarks) {
          ensureMarks(state, editor.extensionManager.splittableMarks)
        }

        tr.split($from.pos).scrollIntoView()
      }

      return true
    }

    if (!$from.parent.isBlock) {
      console.log('early return')
      return false
    }

    const atEnd = $to.parentOffset === $to.parent.content.size

    const deflt =
      $from.depth === 0
        ? undefined
        : defaultBlockAt($from.node(-1).contentMatchAt($from.indexAfter(-1)))

    let types =
      atEnd && deflt
        ? [
            {
              type: deflt,
              attrs: newAttributes,
            },
          ]
        : undefined

    let can = canSplit(tr.doc, tr.mapping.map($from.pos), 1, types)

    if (
      !types &&
      !can &&
      canSplit(
        tr.doc,
        tr.mapping.map($from.pos),
        1,
        deflt ? [{ type: deflt }] : undefined
      )
    ) {
      can = true
      types = deflt
        ? [
            {
              type: deflt,
              attrs: newAttributes,
            },
          ]
        : undefined
    }

    if ($from.node().type.name === 'line_text') {
      can = true
    }

    if (dispatch) {
      if (can) {
        if (selection instanceof TextSelection) {
          tr.deleteSelection()
        }

        tr.split(tr.mapping.map($from.pos), 1, types)

        if (
          deflt &&
          !atEnd &&
          !$from.parentOffset &&
          $from.parent.type !== deflt
        ) {
          const first = tr.mapping.map($from.before())
          const $first = tr.doc.resolve(first)

          if (
            $from
              .node(-1)
              .canReplaceWith($first.index(), $first.index() + 1, deflt)
          ) {
            tr.setNodeMarkup(tr.mapping.map($from.before()), deflt)
          }
        }
      }

      if (keepMarks) {
        ensureMarks(state, editor.extensionManager.splittableMarks)
      }

      tr.scrollIntoView()
    }

    return can
  }

const Line = Node.create({
  name: 'line',
  group: 'block',
  // Contains text and any amount of line_nodes
  content: 'line_text line*',

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
      // If performed on an empty line, delete said line
      Backspace: () => {
        return this.editor.commands.command(({ tr, state, editor }) => {
          return (
            editor.commands.deleteSelection() ||
            editor.commands.joinBackward() ||
            editor.commands.selectNodeBackward()
          )
        })
      },
      Tab: () => {
        return this.editor.commands.command(({ tr, state, editor }) => {
          console.log('what have I DONE')
          return true
        })
      },
      Enter: () => {
        return this.editor.commands.splitListItem('line')
        return this.editor.commands.command(
          ({ tr, state, editor, dispatch, ...rest }) => {
            // return splitBlock()({ tr, state, editor, dispatch, ...rest })
            // return editor.commands.splitListItem('line')
            return editor.commands.splitBlock()
            const { selection } = tr

            // editor.

            const lineSelection = findParentNode((n) => n.type.name === 'line')(
              selection
            )

            assert(
              lineSelection !== undefined &&
                lineSelection.node.type.name === 'line',
              'Could not locate line node'
            )

            let side = lineSelection.pos + lineSelection.node.nodeSize

            const { line, line_text } = editor.schema.nodes
            // const type = lineSelection.node.type

            if (dispatch) {
              const lt = line_text.create()
              const l = line.create(null, lt)

              tr.insert(side, l)

              tr.setSelection(TextSelection.create(tr.doc, side + 2))

              return true
            }
            // tr.insert(side, Line.)

            return false

            console.log('insert at side', side)
          }
        )
      },
    }
  },
})

const Text = Node.create({
  name: 'text',
  group: 'inline',
})

const extensions = [TDoc, Line, LineBody, Text]

const content = `
<div class="line">
  <span class="line-text">Let's make a line node!</span>
</div>
<div class="line">
  <span class="line-text">s</span>
</div>
`

export const TekneEditor = () => {
  const [jsonDoc, setJsonDoc] = useState<any>({})
  const editor = useEditor({
    extensions,
    content,
    editorProps: {
      attributes: {
        class: 'h-full w-full',
      },
    },
    onCreate: ({ editor }) => {
      setJsonDoc(editor.getJSON())
    },
    onUpdate: ({ editor }) => {
      setJsonDoc(editor.getJSON())
    },
  })

  return (
    <div className="editor-container h-full w-full p-8 flex">
      <EditorContent autoFocus className="h-full w-[50%]" editor={editor} />
      <div className="raw-doc w-[50%] overflow-scroll">
        <h1>Raw Node Content</h1>
        <div className="whitespace-pre-wrap font-mono ">
          {JSON.stringify(editor.getJSON(), null, 2)}
        </div>
      </div>
    </div>
  )
}
