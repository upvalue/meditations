import { createTRPCReact } from '@trpc/react-query'
import { createTRPCClient, unstable_localLink } from '@trpc/client'
import type { AppRouter } from './router'
import { appRouter } from './router'
import { dbHandle } from '@/db'

export const trpc = createTRPCReact<AppRouter>()

export const trpcClient = createTRPCClient<AppRouter>({
  links: [
    unstable_localLink({
      router: appRouter,
      createContext: async () => ({ db: await dbHandle() }),
    }),
  ],
})
