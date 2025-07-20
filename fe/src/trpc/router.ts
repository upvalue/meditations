import z from 'zod'
import { router, proc } from './trpc'
import { zdoc, type ZDoc } from '@/editor/schema'

const statedb = z.object({
  names: z.record(z.string(), zdoc),
})

type StateDB = z.infer<typeof statedb>

const getStateDB = () => {
  let db = localStorage.getItem('statedb')
  if (!db) {
    db = JSON.stringify({
      names: {},
    })
    localStorage.setItem('statedb', db)
  }
  return JSON.parse(db) as StateDB
}

const updateNote = (name: string, doc: ZDoc) => {
  const statedb = getStateDB()
  statedb.names[name] = doc
  localStorage.setItem('statedb', JSON.stringify(statedb))
}

window.clearData = () => {
  localStorage.removeItem('statedb')
}

export const appRouter = router({
  ping: proc.query(() => {
    return 'pong2'
  }),

  loadDoc: proc
    .input(
      z.object({
        name: z.string(),
      })
    )
    .query(({ input }) => {
      let statedb = getStateDB()

      let doc = statedb.names[input.name]
      if (!doc) {
        updateNote(input.name, {
          type: 'doc',
          children: [
            {
              type: 'line',
              mdContent: 'The world is your canvas',
              indent: 0,
            },
          ],
        })

        statedb = getStateDB()
        doc = statedb.names[input.name]
      }

      return doc
    }),

  updateDoc: proc
    .input(
      z.object({
        name: z.string(),
        doc: zdoc,
      })
    )
    .mutation(({ input }) => {
      updateNote(input.name, input.doc)
    }),
})

export type AppRouter = typeof appRouter
