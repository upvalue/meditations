import type { ZDoc } from '@/editor/schema'
import type { ColumnType } from 'kysely'

// Custom column type that handles Zod validation
type ZodJsonColumn<T> = ColumnType<T, T, T>

// Define your database schema interface here
export type Database = {
  notes: {
    title: string
    body: ZodJsonColumn<ZDoc>
  }
}
