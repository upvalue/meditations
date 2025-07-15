import { useEditor, EditorContent } from '@tiptap/react'
import { mergeAttributes, Node } from '@tiptap/core'
import { Paragraph } from '@tiptap/extension-paragraph'
import { useState } from 'react'
import { invariant } from '@tanstack/react-router'
import './Editor.css'

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
      'Shift-Tab': () => {
        this.editor.commands.liftListItem('lineBody')
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
