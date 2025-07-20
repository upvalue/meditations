import { initTRPC } from '@trpc/server'

export const t = initTRPC.create({
  allowOutsideOfServer: true,
})

export const router = t.router
export const proc = t.procedure
