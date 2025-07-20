import { PGlite } from '@electric-sql/pglite'
import { Kysely, PostgresDialect } from 'kysely'
import { PGliteDialect } from 'kysely-pglite-dialect'
import type { Database } from './types'
import { migrateToLatest } from './migrations'

export { type Database } from './types'

declare global {
  interface Window {
    dbHandle: PGlite
    db: Kysely<Database>
  }
}

export const dbMemory = async () => {
  if (window.db)
    return {
      db: window.db,
      dbHandle: window.dbHandle,
    }

  const handle = new PGlite('idb://test1')

  window.dbHandle = handle

  const db = new Kysely<Database>({
    dialect: new PGliteDialect(handle),
  })

  window.db = db

  await migrateToLatest(db)

  return {
    db,
    dbHandle: handle,
  }
}

export const dbServer = async () => {
  const { Pool } = await import('pg')

  const db = new Kysely<Database>({
    dialect: new PostgresDialect({
      pool: async () => {
        const pool = new Pool({
          connectionString: process.env.DATABASE_URL!,
        })
        return pool
      },
    }),
  })

  return db
}

export const dbHandle = async () => {
  if (typeof process !== 'undefined') {
    return dbServer()
  }

  return (await dbMemory()).db
}
