import { DevTools } from '@/dev/DevTools'
import { Help } from './Help'
import { Search } from './Search'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { HelpCircle, Wrench, Search as SearchIcon } from 'lucide-react'

export function Panel() {
  return (
    <div className="h-full flex flex-col max-h-[93vh] overflow-y-auto">
      <Tabs defaultValue="devtools" className="flex flex-col h-full">
        <div className="flex items-center border-b border-zinc-800 px-2 py-1">
          <TabsList className="bg-transparent p-0 h-auto gap-1">
            <TabsTrigger
              value="search"
              className="p-2 rounded data-[state=active]:bg-zinc-800 hover:bg-zinc-800/50"
              title="Search"
            >
              <SearchIcon className="w-4 h-4" />
            </TabsTrigger>
            <TabsTrigger
              value="help"
              className="p-2 rounded data-[state=active]:bg-zinc-800 hover:bg-zinc-800/50"
              title="Help"
            >
              <HelpCircle className="w-4 h-4" />
            </TabsTrigger>
            <TabsTrigger
              value="devtools"
              className="p-2 rounded data-[state=active]:bg-zinc-800 hover:bg-zinc-800/50"
              title="DevTools"
            >
              <Wrench className="w-4 h-4" />
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="search" className="flex-1 overflow-auto">
          <Search />
        </TabsContent>
        <TabsContent value="help" className="flex-1 overflow-auto">
          <Help />
        </TabsContent>
        <TabsContent value="devtools" className="flex-1 overflow-auto p-4">
          <DevTools />
        </TabsContent>
      </Tabs>
    </div>
  )
}
