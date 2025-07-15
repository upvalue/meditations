import { useEditor, EditorContent } from '@tiptap/react'
import { mergeAttributes, Node } from '@tiptap/core'
import { Paragraph } from '@tiptap/extension-paragraph'
import { useState } from 'react'
import { invariant } from '@tanstack/react-router'

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

const Text = Node.create({
  name: 'text',
  group: 'inline',
})

const Line = Node.create({
  name: 'line',
  group: 'block',

  addOptions() {
    return {
      itemTypeName: 'lineBody',
      HTMLAttributes: {},
      keepMarks: false,
      keepAttributes: false,
    }
  },

  content() {
    return `${this.options.itemTypeName}*`
  },

  parseHTML() {
    return [{ tag: 'div.line' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes({ class: 'line' }, HTMLAttributes), 0]
  },
})

const LineBody = Node.create({
  name: 'lineBody',

  addOptions() {
    return {
      HTMLAttributes: {},
      bulletListTypeName: 'line',
    }
  },

  content: 'paragraph block*',

  defining: true,

  parseHTML() {
    return [
      {
        tag: 'div.line-body',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes({ class: 'line-body' }, HTMLAttributes), 0]
  },

  addKeyboardShortcuts() {
    return {
      Enter: () => this.editor.commands.splitListItem('lineBody'),
      Tab: () => {
        this.editor.commands.sinkListItem('lineBody')
        // Swallow tab commands instead of refusing to multi-indent
        return true
      },
    }
  },
})

const extensions = [TDoc, Line, LineBody, Paragraph, Text]

const content = `
<div class="line">
 <div class="line-body"><p>hi</p></div>
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
