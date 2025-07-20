import { dbMemory } from '@/db'
import type { PGlite } from '@electric-sql/pglite'
import { Repl } from '@electric-sql/pglite-repl'
import { useEffect, useRef, useState, type RefObject } from 'react'

export const PgliteRepl = () => {
  const dbHandleRef: RefObject<PGlite | null> = useRef(null)
  const [haveDb, setHaveDb] = useState(false)
  useEffect(() => {
    dbMemory().then(({ dbHandle }) => {
      dbHandleRef.current = dbHandle
      setHaveDb(true)
    })
  }, [])

  return (
    <div>
      {haveDb && dbHandleRef.current && <Repl pg={dbHandleRef.current} />}
    </div>
  )
}
