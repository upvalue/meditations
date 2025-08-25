import z from 'zod'
import { lineMake, zdoc, type ZDoc } from '@/editor/schema'
import { initTRPC } from '@trpc/server'
import type { Database } from '@/db'
import { sql, type Kysely } from 'kysely'
import { documentNameSchema } from '@/lib/validation'
import { makeTutorial } from '@/lib/tutorial'


import fs from 'fs'
import child_process from 'child_process'

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
  doc.body.children = doc.body.children.map((child: any) => {
    const mod = { ...child }
    if (!child.createdAt) {
      mod.createdAt = new Date().toISOString()
      mod.updatedAt = new Date().toISOString()
    }
    if (!child.timeCreated) {
      mod.timeCreated = mod.createdAt
    }
    if (!child.timeUpdated) {
      mod.timeUpdated = mod.updatedAt
    }
    if (child.datumTaskStatus) {
      mod.datumTaskStatus = child.datumTaskStatus
    }
    return mod
  })
  return {
    ...doc,
    body: {
      ...doc.body,
      schemaVersion: 1,
    },
  }
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

  searchDocs: proc
    .input(
      z.object({
        query: z.string(),
      })
    )
    .query(async ({ input, ctx: { db } }) => {
      let query = db.selectFrom('notes').select(['title'])

      if (input.query.length > 0) {
        query = query.where('title', 'ilike', `%${input.query}%`)
      }

      const docs = await query.execute()

      return docs.map((doc) => ({
        id: doc.title,
        title: doc.title,
        subtitle: 'Document',
      }))
    }),

  loadDoc: proc
    .input(
      z.object({
        name: z.string(),
      })
    )
    .query(async ({ input, ctx: { db } }): Promise<ZDoc> => {
      let doc = await db
        .selectFrom('notes')
        .selectAll()
        .where('title', '=', input.name)
        .executeTakeFirst()

      if (!doc) {
        const mydoc: ZDoc = {
          type: 'doc',
          schemaVersion: 1,
          children: [lineMake(0, 'Empty test document')],
        }

        if (input.name === 'Tutorial') {
          mydoc.children = makeTutorial()
        }

        await upsertNote(db, input.name, mydoc)
        return mydoc
      }

      doc = docMigrator(doc)

      return doc!.body
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

  renameDoc: proc
    .input(
      z.object({
        oldName: z.string(),
        newName: documentNameSchema,
      })
    )
    .mutation(async ({ input, ctx: { db } }) => {
      const { oldName, newName } = input

      // Check if new name already exists
      const existingDoc = await db
        .selectFrom('notes')
        .select(['title'])
        .where('title', '=', newName)
        .executeTakeFirst()

      if (existingDoc) {
        throw new Error(`Document with name "${newName}" already exists`)
      }

      // Get the old document
      const oldDoc = await db
        .selectFrom('notes')
        .selectAll()
        .where('title', '=', oldName)
        .executeTakeFirst()

      if (!oldDoc) {
        throw new Error(`Document "${oldName}" not found`)
      }

      // Create new document and delete old one
      await db.transaction().execute(async (trx) => {
        await trx
          .insertInto('notes')
          .values({
            title: newName,
            body: oldDoc.body,
          })
          .execute()

        await trx.deleteFrom('notes').where('title', '=', oldName).execute()
      })

      return { success: true, newName }
    }),

  execHook: proc
    .input(
      z.object({
        hook: z.enum(['timer-start', 'timer-stop']),
        argument: z.any(),
      })
    )
    .mutation(async ({ input }) => {
      console.log('execHook', input);
      const { hook, argument } = input

      // If running on server
      if(typeof process !== 'undefined') {
        if(input.hook === 'timer-start' || input.hook === 'timer-stop') {
          const {line} = argument;
          if(fs.existsSync('hooks/timer-start')) {
            child_process.execSync('hooks/timer-start', { input: JSON.stringify({
              type: 'timer-event',
              line
            })});
          }
        } 
      } else {
        console.log('[hook] client execHook', hook, argument)
      }
    }),

  createDoc: proc
    .input(
      z.object({
        name: documentNameSchema,
      })
    )
    .mutation(async ({ input, ctx: { db } }) => {
      const { name } = input

      // Check if document already exists
      const existingDoc = await db
        .selectFrom('notes')
        .select(['title'])
        .where('title', '=', name)
        .executeTakeFirst()

      if (existingDoc) {
        throw new Error(`Document with name "${name}" already exists`)
      }

      const newDoc: ZDoc = {
        type: 'doc',
        schemaVersion: 1,
        children: [
          {
            type: 'line',
            mdContent: 'The world is your canvas',
            indent: 0,
            timeCreated: new Date().toISOString(),
            timeUpdated: new Date().toISOString(),
          },
        ],
      }

      await upsertNote(db, name, newDoc)

      return { success: true, name }
    }),
})

export type AppRouter = typeof appRouter
