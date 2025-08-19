import { HeroUIProvider } from '@heroui/react'
import { Outlet, createRootRouteWithContext } from '@tanstack/react-router'
import { trpc } from '@/trpc'
import { Toaster } from '@/components/ui/sonner'

export type RouterAppContext = {
  trpc: typeof trpc
}

const RootComponent = () => {
  return (
    <>
      <HeroUIProvider className="dark  h-full">
        <Outlet />
        <Toaster />
      </HeroUIProvider>
    </>
  )
}

export const Route = createRootRouteWithContext<RouterAppContext>()({
  component: RootComponent,
})
