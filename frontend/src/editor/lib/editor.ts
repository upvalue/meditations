// editor.ts - slatejs extensions
import { withReact, ReactEditor } from 'slate-react'
import { Editor, createEditor, Transforms, Range, Element } from 'slate';

const softAssert = (exp: boolean, message: string) => {
  if (!exp) {
    console.warn('editor invariant failed', message, exp);
  }
}

type Shortcut = {
  type: 'heading',
  level: number,
};

const shortcuts: { [key: string]: Shortcut | undefined } = {
  '#': {
    type: 'heading',
    level: 1,
  },
  '##': {
    type: 'heading',
    level: 2,
  },
  '###': {
    type: 'heading',
    level: 3,
  },
}

const withTechne = (editor: Editor) => {
  const { insertText, deleteBackward, insertNode, insertBreak, deleteFragment, isVoid, isInline, normalizeNode } = editor;

  editor.deleteBackward = unit => {
    return deleteBackward(unit);
  }

  // Teach Slate about our custom types
  editor.isInline = elt => {
    return elt.type === 'tag' ? true : isInline(elt);
  }

  editor.isVoid = elt => {
    return elt.type === 'tag' ? true : isVoid(elt);
  }

  // TODO: I'm not sure what the best behavior is here. 
  // Should it carry forward formatting?
  // Also, this is where you might escape from lists/blockquotes if applicable.
  // Need to check for an empty entry and then insert a text node afterwards
  const insertBrk = () => {
    // Allow user to exit lists and blockquotes by entering through an empty node
    const { selection } = editor;

    // We don't check for a collapsed range here, because regardless of whether the user has 
    // selected (& deleted) text, we don't want to carry over toplevel line formatting to the 
    // next line
    if (selection) {
      const block = Editor.above(editor, {
        match: n => Editor.isBlock(editor, n)
      });

      softAssert(!!block, "break should always have ancestor block");

      if (!block) {
        insertBreak();
        return;
      }

      // Normal behavior is to split nodes; but this means it's possible to carry over
      // formatting from the previous line which is behavior that we don't want. Maybe it uses
      // splitNodes because it doesn't require understanding the schema? But we understand 
      // it, so it's okay to do this instead.
      insertNode({
        type: "line",
        children: [
          {
            type: "text",
            text: "",
          }
        ]
      })

      return;
    }

    insertBreak();
  }

  editor.insertBreak = insertBrk

  editor.deleteFragment = () => {
    console.log('deleteFragment');
    deleteFragment();
  }

  editor.insertNode = insertedNode => {
    console.log('inserted node', insertedNode);
    insertNode(insertedNode);
  }

  editor.insertText = insertedText => {
    const { selection } = editor;

    if (insertedText === ' ' && selection && Range.isCollapsed(selection)) {
      const { anchor } = selection;
      const block = Editor.above(editor, {
        match: n => Editor.isBlock(editor, n),
      })
      const path = block ? block[1] : []
      const start = Editor.start(editor, path)
      const range = { anchor, focus: start }
      const beforeText = Editor.string(editor, range)

      const shortcut = shortcuts[beforeText];

      if (shortcut) {
        Transforms.select(editor, range);
        Transforms.delete(editor);
        Transforms.setNodes(
          editor,
          shortcut,
          { match: n => Editor.isBlock(editor, n) }
        )

        return;
      }
    }

    insertText(insertedText);
  }

  return editor;
}

export const insertTag = (editor: EditorInstance, tag: string) => {
  const entry = {
    type: 'tag',
    tagId: tag,
    children: [{ text: '' }],
  }
  // Remove the entered text
  // Commented out lines are for toplevel-only voids (ats)
  // Transforms.removeNodes(editor);
  // Insert the entry
  Transforms.insertNodes(editor, entry);
  Transforms.move(editor);
}

/**
 * An instance of a refractory SlateJS editor with React add-ons
 */
export type EditorInstance = Editor & ReactEditor;

/**
 * Instantiate a SlateJS editor instance with custom modifications
 */
export const makeEditor = (): EditorInstance => {
  return withReact(withTechne(createEditor()));
}
