import {
  useEditor,
  EditorContent,
  NodeViewWrapper,
  NodeViewContent,
  ReactNodeViewRenderer,
  ReactRenderer,
} from '@tiptap/react'
import { BeakerIcon, CircleStackIcon } from '@heroicons/react/20/solid'
import {
  Editor,
  Extension,
  InputRule,
  mergeAttributes,
  Node,
  nodeInputRule,
  posToDOMRect,
  type NodeViewProps,
} from '@tiptap/core'
import Suggestion from '@tiptap/suggestion'
import { Paragraph } from '@tiptap/extension-paragraph'
import { invariant } from '@tanstack/react-router'
import './Editor.css'
import Icon from '@/Icon'
import { computePosition, flip, shift } from '@floating-ui/dom'

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

const SlashCommandList = () => {
  return <div className="text-white">Why hello there</div>
}

const updatePosition = (editor, element) => {
  const virtualElement = {
    getBoundingClientRect: () =>
      posToDOMRect(
        editor.view,
        editor.state.selection.from,
        editor.state.selection.to
      ),
  }

  computePosition(virtualElement, element, {
    placement: 'bottom-start',
    strategy: 'absolute',
    middleware: [shift(), flip()],
  }).then(({ x, y, strategy }) => {
    element.style.width = 'max-content'
    element.style.position = strategy
    element.style.left = `${x}px`
    element.style.top = `${y}px`
  })
}

const render = () => {
  let component: any

  return {
    onStart: (props) => {
      const component = new ReactRenderer(SlashCommandList, {
        props,
        editor: props.editor,
      })

      if (!props.clientRect) return

      component.element.style.position = 'absolute'

      document.body.appendChild(component.element)

      updatePosition(props.editor, component.element)
    },
    onUpdate: (props) => {
      if (!component) return
      component.updateProps(props)

      if (!props.clientRect) return

      updatePosition(props.editor, component.element)
    },
    onKeyDown: (props) => {
      if (props.event.key === 'Escape') {
        component.destroy()
        return true
      }

      return component.ref?.onKeyDown(props)
    },
    onExit: (props) => {
      if (!component) return
      component.element.remove()
      component.destroy()
    },
  }
}

const SlashCommand = Extension.create({
  name: 'slashCommand',

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        char: '/',
        // Is this indirection necessary? It's only for
        // making this extension configurable, right.
        items: () => {
          console.log('WHATSTAETEARHFREOAKFER')
          return ['apple', 'orange', 'banana']
        },
        render,
        // But I don't need it to be configurable because I own it.
      }),
    ]
  },
})

const TDoc = Node.create({
  name: 'doc',
  topNode: true,
  content: 'line+',
})

const Text = Node.create({
  name: 'text',
  group: 'inline',
})

/**
 * Controls that appear to the left of each line
 */
const LineBodyControls = ({
  node,
  editor,
  getPos,
  HTMLAttributes,
  updateAttributes,
}: NodeViewProps) => {
  return (
    <NodeViewWrapper>
      <div className="flex items-top" {...HTMLAttributes}>
        <div
          onClick={() => {
            console.log('you found me hehe')
          }}
        >
          <Icon icon={BeakerIcon} className="mr-2" />
        </div>
        {HTMLAttributes['data-is-checkbox'] ? 'true' : 'false'}
        <div
          onClick={(e) => {
            e.preventDefault()
            console.log('converting to checkbox')
            const { view } = editor
            updateAttributes({
              isCheckbox: !node.attrs.isCheckbox,
            })
            editor.commands.command(({ tr, view }) => {
              /*
              tr.setNodeMarkup(getPos()!, undefined, {
                isCheckbox: true,
              })
                */

              return true
            })
          }}
          className="cursor-pointer"
        >
          <Icon icon={CircleStackIcon} className="mr-2" />
        </div>
        <NodeViewContent />
      </div>
    </NodeViewWrapper>
  )
}
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

  addAttributes() {
    return {
      isCheckbox: {
        default: true,
        parseHTML: (elt) => elt.dataset.isCheckbox === 'true',
        renderHTML: (attrs) => {
          return { 'data-is-checkbox': attrs.isCheckbox }
        },
      },
    }
  },

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

const extensions = [
  // Document structure
  TDoc,
  Line,
  LineBody,
  Paragraph,
  Tag,
  Text,
  // Functional extensions
  // SlashCommand,
]

const content = `
<div class="line">
 <div class="line-body"><p>
 
 <span class="tag" data-name="#tag1">#tag1</span> TEst tag
</p></div>
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
