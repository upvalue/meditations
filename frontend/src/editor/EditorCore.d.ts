
export type EditorCallbacks = {
  onAction: (action: 'collection', ange: Range, word: string) => void,
  onClear: () => void,
};

export declare class EditorCore {
  mount(editor: HTMLElement, callbacks: EditorCallbacks);
};

export as namespace EditorCore;