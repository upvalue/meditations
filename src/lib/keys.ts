// keys.ts -- Key bindings

export interface Keybinding {
  /** The key combination (e.g., 'meta+k', 'ctrl+shift+p') */
  key: string
  /** Descriptive name for the keybinding (e.g., 'document-search') */
  name: string
  /** Human-readable description of what the keybinding does */
  description: string
  /** Display string for the key combination (e.g., '⌘ K') */
  displayKey: string
}

export const keybindings = {
  documentSearch: {
    key: 'meta+k',
    name: 'document-search',
    description: 'Open a document',
    displayKey: '⌘ K',
  },
  commandPalette: {
    key: 'meta+shift+k',
    name: 'command-palette',
    description: 'Run a command',
    displayKey: '⌘ Shift K',
  },
} as const satisfies Record<string, Keybinding>

/** Get all keybindings as an array */
export const getAllKeybindings = (): Keybinding[] => {
  return Object.values(keybindings)
}

/** Get a specific keybinding by name */
export const getKeybinding = (name: keyof typeof keybindings): Keybinding => {
  return keybindings[name]
}