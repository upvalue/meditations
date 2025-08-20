import React from 'react'
import { KBarProvider, type Action } from 'kbar'
import { useMemo } from 'react'
import { KBarModal, KBarSearchInput, KBarResultRenderer } from './KBar'

const CommandPaletteContent = () => {
  return (
    <KBarModal>
      <KBarSearchInput placeholder="Run a command…" />
      <div className="border-t border-gray-200 overflow-y-auto">
        <KBarResultRenderer />
      </div>
    </KBarModal>
  )
}

export const CommandPalette: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // Lorem ipsum actions for testing
  const actions = useMemo((): Action[] => {
    return [
      {
        id: 'lorem-1',
        name: 'Lorem ipsum dolor sit amet',
        subtitle: 'consectetur adipiscing elit',
        perform: () => console.log('Lorem action 1'),
        keywords: 'lorem ipsum dolor',
      },
      {
        id: 'lorem-2',
        name: 'Sed do eiusmod tempor incididunt',
        subtitle: 'ut labore et dolore magna aliqua',
        perform: () => console.log('Lorem action 2'),
        keywords: 'sed tempor incididunt',
      },
      {
        id: 'lorem-3',
        name: 'Ut enim ad minim veniam',
        subtitle: 'quis nostrud exercitation',
        perform: () => console.log('Lorem action 3'),
        keywords: 'ut enim minim veniam',
      },
      {
        id: 'lorem-4',
        name: 'Duis aute irure dolor',
        subtitle: 'in reprehenderit in voluptate',
        perform: () => console.log('Lorem action 4'),
        keywords: 'duis aute irure dolor',
      },
      {
        id: 'lorem-5',
        name: 'Excepteur sint occaecat cupidatat',
        subtitle: 'non proident sunt in culpa',
        perform: () => console.log('Lorem action 5'),
        keywords: 'excepteur sint occaecat',
      },
    ]
  }, [])

  return (
    <KBarProvider
      actions={actions}
      options={{
        toggleShortcut: '$mod+Shift+k',
      }}
    >
      <CommandPaletteContent />
      {children}
    </KBarProvider>
  )
}
