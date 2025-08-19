import z from 'zod'
import { zdoc, type ZDoc } from '@/editor/schema'
import { initTRPC } from '@trpc/server'
import type { Database } from '@/db'
import { sql, type Kysely } from 'kysely'

export const t = initTRPC.context<{ db: Kysely<Database> }>().create({
  allowOutsideOfServer: true,
})

export const router = t.router
export const proc = t.procedure

/**
 * While developing, it's sometimes useful to just change
 * the schema of data on the fly while not making a big deal
 * out of it with the database
 */
const docMigrator = (doc: any): any => {
  doc.body.children = doc.body.children.map((child) => {
    if (child.createdAt) return child
    return {
      ...child,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  })
  return doc
}

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

export const appRouter = router({
  healthcheck: proc.query(async ({ ctx: { db } }) => {
    const q = await db
      .selectFrom(sql`(select 1)`.as('subquery'))
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
      let doc = await db
        .selectFrom('notes')
        .selectAll()
        .where('title', '=', input.name)
        .executeTakeFirst()

      if (!doc) {
        const mydoc: ZDoc = {
          type: 'doc',
          children: [
            {
              type: 'line',
              mdContent: 'The world is your canvas',
              indent: 0,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ],
        }

        await upsertNote(db, input.name, mydoc)
        return mydoc
      }

      doc = docMigrator(doc)

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
      console.log('updateDoc', input)
      await upsertNote(db, input.name, input.doc)

      return true
    }),
})

export type AppRouter = typeof appRouter
