import {
  useEditor,
  EditorContent,
  NodeViewWrapper,
  NodeViewContent,
  ReactNodeViewRenderer,
} from '@tiptap/react'
import { BeakerIcon } from '@heroicons/react/20/solid'
import { InputRule, mergeAttributes, Node, nodeInputRule } from '@tiptap/core'
import { Paragraph } from '@tiptap/extension-paragraph'
import { invariant } from '@tanstack/react-router'
import './Editor.css'
import Icon from '@/Icon'

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

const LineBodyControls = ({ node }: { node: any }) => {
  return (
    <NodeViewWrapper>
      <div className="flex items-top">
        <div
          onClick={() => {
            console.log('you found me hehe')
          }}
        >
          <Icon icon={BeakerIcon} className="mr-2" />
        </div>
        <NodeViewContent />
      </div>
    </NodeViewWrapper>
  )
}

const Tag = Node.create({
  name: 'tag',
  group: 'inline',
  // Unclear why this is necessary in addition to group: 'inline',
  // but omitting it causes an error when a tag is added.
  inline: true,
  atom: true,
  selectable: false,

  addAttributes() {
    return {
      name: {
        default: null,
        parseHTML: (elt) => elt.dataset.name,
        renderHTML: (attrs) => {
          return {
            'data-name': attrs.name,
          }
        },
      },
    }
  },

  parseHTML() {
    // return [{ tag: `span.tag[data-name=${this.name}]` }]
    return [{ tag: `span.tag` }]
  },

  renderHTML({ node, HTMLAttributes }) {
    console.log('this', this)
    return [
      'span',
      mergeAttributes({ class: 'tag', name: node.attrs.name }, HTMLAttributes),
      // render name as body
      node.attrs.name,
    ]
  },

  // TODO: Tags cannot be copied

  addInputRules() {
    return [
      new InputRule({
        // TODO: Handle tag at end of line with no space after.
        find: /(#\w+)\s$/,
        handler: ({ range, match, chain }) => {
          const name = match[1]

          chain()
            .deleteRange(range)
            .insertContentAt(range.from, [
              {
                type: this.type.name,
                attrs: { name },
              },
              {
                type: 'text',
                text: ' ',
              },
            ])
            .command(({ tr, state }) => {
              tr.setStoredMarks(
                state.doc.resolve(state.selection.to - 1).marks()
              )
              return true
            })
            .run()
        },
      }),
    ]
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

  addNodeView() {
    return ReactNodeViewRenderer(LineBodyControls, {})
  },
})

const extensions = [TDoc, Line, LineBody, Paragraph, Tag, Text]

const content = `
<div class="line">
 <div class="line-body"><p>hi</p></div>
</div>
`

export const TEditor = ({
  onDocChange,
}: {
  onDocChange: (doc: any) => void
}) => {
  const editor = useEditor({
    extensions,
    content,
    editorProps: {
      attributes: {
        class: 'h-full w-full',
      },
    },
    onCreate: ({ editor }) => {
      onDocChange(editor.getJSON())
    },
    onUpdate: ({ editor }) => {
      onDocChange(editor.getJSON())
    },
  })

  return (
    <div className="editor-container h-full w-full ">
      <EditorContent autoFocus className="h-full w-full" editor={editor} />
    </div>
  )
}
