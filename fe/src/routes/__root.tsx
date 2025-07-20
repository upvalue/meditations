import { HeroUIProvider } from '@heroui/react'
import { Outlet, createRootRouteWithContext } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { trpc } from '@/trpc'

export type RouterAppContext = {
  trpc: typeof trpc
}

const RootComponent = () => {
  return (
    <>
      <HeroUIProvider className="dark ">
        <Outlet />
      </HeroUIProvider>
      <TanStackRouterDevtools />
    </>
  )
}

export const Route = createRootRouteWithContext<RouterAppContext>()({
  component: RootComponent,
})
