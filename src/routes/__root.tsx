import { Outlet, createRootRouteWithContext } from '@tanstack/react-router'
import { trpc } from '@/trpc'
import { Toaster } from '@/components/ui/sonner'
import { DocumentSearch } from '@/controls/DocumentSearch'
import { CommandPalette } from '@/controls/CommandPalette'
import { useTitle } from '@/hooks/useTitle'

export type RouterAppContext = {
  trpc: typeof trpc
}

const RootComponent = () => {
  useTitle()
  
  return (
    <DocumentSearch>
      <CommandPalette>
        <Outlet />
        <Toaster />
      </CommandPalette>
    </DocumentSearch>
  )
}

export const Route = createRootRouteWithContext<RouterAppContext>()({
  component: RootComponent,
})
