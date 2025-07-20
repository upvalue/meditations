import z from 'zod'
import { zdoc, type ZDoc } from '@/editor/schema'
import { initTRPC } from '@trpc/server'
import type { Database } from '@/db'
import { sql, type Kysely } from 'kysely'

type Context = {}

export const t = initTRPC.context<{ db: Kysely<Database> }>().create({
  allowOutsideOfServer: true,
})

export const router = t.router
export const proc = t.procedure

const upsertNote = (db: Kysely<Database>, name: string, body: ZDoc) => {
  const r = db
    .insertInto('notes')
    .values({
      title: name,
      body,
    })
    .onConflict((oc) => oc.column('title').doUpdateSet({ body }))
    .execute()

  console.log('upsertNote', r)
  return r
}

// @ts-expect-error
window.clearData = () => {
  localStorage.removeItem('statedb')
}

export const appRouter = router({
  healthcheck: proc.query(async ({ ctx: { db } }) => {
    const q = await db
      .selectFrom(sql`(select 1) as subquery`.as('subquery'))
      .selectAll()
      .execute()

    return q
  }),

  ping: proc.query(() => {
    return 'pong2'
  }),

  loadDoc: proc
    .input(
      z.object({
        name: z.string(),
      })
    )
    .query(async ({ input, ctx: { db } }) => {
      console.log('loadDoc called')
      const doc = await db
        .selectFrom('notes')
        .selectAll()
        .where('title', '=', input.name)
        .executeTakeFirst()

      console.log('lodDoc 2', doc)

      if (!doc) {
        const mydoc: ZDoc = {
          type: 'doc',
          children: [
            {
              type: 'line',
              mdContent: 'The world is your canvas',
              indent: 0,
            },
          ],
        }

        await upsertNote(db, input.name, mydoc)
        return mydoc
      }

      return doc.body
    }),

  updateDoc: proc
    .input(
      z.object({
        name: z.string(),
        doc: zdoc,
      })
    )
    .mutation(async ({ input, ctx: { db } }) => {
      await upsertNote(db, input.name, input.doc)
      return true
    }),
})

export type AppRouter = typeof appRouter
