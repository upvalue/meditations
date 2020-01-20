
export type EditorActionKey = 'tab' | 'enter' | 'arrow-down' | 'arrow-up';

export type EditorCallbacks = {
  onAction: (action: 'collection', range: Range, word: string) => void,
  onActionKeydown: (editorCore: EditorCore, key: EditorActionKey) => void,
  onClear: () => void,
};

export declare class EditorCore {
  mount(id: string, editor: HTMLElement, callbacks: EditorCallbacks);
  unmount();
  splitOnAction(action: string, callback: (nodeId: string, before: string, line: string, after: string) => void)
};

export as namespace EditorCore;