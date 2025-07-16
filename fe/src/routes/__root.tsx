import { HeroUIProvider } from '@heroui/react'
import { Outlet, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'

export const Route = createRootRoute({
  component: () => (
    <>
      <HeroUIProvider className="dark ">
        <Outlet />
      </HeroUIProvider>
      <TanStackRouterDevtools />
    </>
  ),
})
