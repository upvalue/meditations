import { dbMemory } from '@/db'
import type { PGlite } from '@electric-sql/pglite'
import { Repl } from '@electric-sql/pglite-repl'
import { useEffect, useRef, useState, type RefObject } from 'react'
import { useRouter } from '@tanstack/react-router'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { useAtom } from 'jotai'
import { analyzeDoc, type ZTreeLine } from '@/editor/schema'
import { docAtom } from '@/editor/state'
import { uniq } from 'lodash-es'

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

const RawDocument = () => {
  const [doc] = useAtom(docAtom)
  return (
    <div className="whitespace-pre-wrap font-mono">
      {JSON.stringify(doc, null, 2)}
    </div>
  )
}

const TreeDocument = () => {
  const [doc] = useAtom(docAtom)
  return (
    <div className="whitespace-pre-wrap font-mono">
      {JSON.stringify(analyzeDoc(doc), null, 2)}
    </div>
  )
}

type TagData = {
  [name: string]: {
    name: string
    complete: number | undefined
    incomplete: number | undefined
  }
}

// Some experimental analysis code
const diveLine = (line: ZTreeLine, tagData: TagData, tags: string[]) => {
  for (const tag of tags) {
    if (!tagData[tag]) {
      tagData[tag] = {
        name: tag,
        complete: undefined,
        incomplete: undefined,
      }
    }

    if (line.datumTaskStatus === 'complete') {
      if (tagData[tag].complete === undefined) {
        tagData[tag].complete = 0
      }
      tagData[tag].complete += 1
    } else if (line.datumTaskStatus) {
      if (tagData[tag].incomplete === undefined) {
        tagData[tag].incomplete = 0
      }
      tagData[tag].incomplete += 1
    }
  }

  for (const child of line.children) {
    diveLine(child, tagData, uniq([...tags, ...child.tags]))
  }
}

const TimeView = () => {
  const [doc] = useAtom(docAtom)
  const tree = analyzeDoc(doc)

  const tagData: TagData = {}

  tree.children.forEach((child) => diveLine(child, tagData, child.tags))

  return JSON.stringify(tagData, null, 2)
}

export const DevTools = () => {
  const router = useRouter()
  return (
    <Tabs>
      <TabsList>
        <TabsTrigger value="time">Time View</TabsTrigger>
        <TabsTrigger value="raw">Document Content</TabsTrigger>
        <TabsTrigger value="tree">Tree Document</TabsTrigger>
        <TabsTrigger value="dev">PG Repl</TabsTrigger>
        <TabsTrigger value="tanstackdev">TanStack Devtools</TabsTrigger>
      </TabsList>
      <TabsContent value="time">
        <TimeView />
      </TabsContent>
      <TabsContent value="raw">
        <RawDocument />
      </TabsContent>
      <TabsContent value="tree">
        <TreeDocument />
      </TabsContent>
      <TabsContent value="dev">
        <PgliteRepl />
      </TabsContent>
      <TabsContent value="tanstackdev">
        <TanStackRouterDevtoolsPanel router={router} />
      </TabsContent>
    </Tabs>
  )
}
