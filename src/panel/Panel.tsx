import { DevTools } from '@/dev/DevTools'
import { Help } from './Help'
import { Search } from './Search'
import { GitInfo } from './GitInfo'
import {
  Navbar,
  NavbarSection,
  NavbarItem,
  NavbarLabel,
} from '@/components/ui/navbar'
import {
  WrenchScrewdriverIcon,
  MagnifyingGlassIcon,
  QuestionMarkCircleIcon,
} from '@heroicons/react/24/solid'
import { useState } from 'react'

export function Panel() {
  const [activeTab, setActiveTab] = useState('devtools')

  return (
    <div className="flex flex-col h-[100vh]">
      <div className="flex items-center border-b border-zinc-800 px-2 py-1 flex-shrink-0">
        <Navbar className="bg-transparent p-0 h-auto gap-1">
          <NavbarSection>
            <NavbarItem
              current={activeTab === 'devtools'}
              onClick={() => setActiveTab('devtools')}
            >
              <WrenchScrewdriverIcon className="w-4 h-4" data-slot="icon" />
              <NavbarLabel>Dev</NavbarLabel>
            </NavbarItem>
            {/*
            <NavbarItem
              current={activeTab === 'search'}
              onClick={() => setActiveTab('search')}
            >
              <MagnifyingGlassIcon className="w-4 h-4" data-slot="icon" />
              <NavbarLabel>Search</NavbarLabel>
            </NavbarItem>
            */}
            <NavbarItem
              current={activeTab === 'help'}
              onClick={() => setActiveTab('help')}
            >
              <QuestionMarkCircleIcon className="w-4 h-4" data-slot="icon" />
              <NavbarLabel>Help</NavbarLabel>
            </NavbarItem>
          </NavbarSection>
        </Navbar>
      </div>
      <div className="flex-1 overflow-auto min-h-0">
        {activeTab === 'search' && <Search />}
        {activeTab === 'help' && <Help />}
        {activeTab === 'devtools' && (
          <div className="p-4 h-full">
            <DevTools />
          </div>
        )}
      </div>
      <div className="flex-shrink-0">
        <GitInfo />
      </div>
    </div>
  )
}
