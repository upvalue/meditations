import { TEditor } from '@/editor/TEditor'
import { Tabs, Tab } from '@heroui/react'
import { docAtom } from '@/editor/state'
import { createStore, useAtom } from 'jotai'
import { analyzeDoc, type ZTreeLine } from '@/editor/schema'
import { uniq } from 'lodash-es'
import { Provider } from 'jotai'
import { trpc } from '@/trpc'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useMemo, useRef } from 'react'
import { useCustomEventListener } from '@/hooks/useCustomEventListener'
import { type WikiLinkClickEventDetail } from '@/editor/line-editor'
import { PgliteRepl } from '@/dev/DevTools'

export const Route = createFileRoute('/n/$title')({
  component: RouteComponent,
})

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

const diveLine = (line: ZTreeLine, tagData: TagData, tags: string[]) => {
  for (const tag of tags) {
    if (!tagData[tag]) {
      tagData[tag] = {
        name: tag,
        complete: undefined,
        incomplete: undefined,
      }
    }

    if (line.taskStatus === 'complete') {
      if (tagData[tag].complete === undefined) {
        tagData[tag].complete = 0
      }
      tagData[tag].complete += 1
    } else if (line.taskStatus) {
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

function RouteComponent() {
  const title = Route.useParams({
    select: (p) => p.title,
  })

  const updateDocMutation = trpc.updateDoc.useMutation()

  const store = useMemo(() => {
    const store = createStore()
    return store
  }, [])

  const loadDocQuery = trpc.loadDoc.useQuery({ name: title })

  useEffect(() => {
    if (loadDocQuery.isLoading) return
    const unsub = store.sub(docAtom, () => {
      updateDocMutation.mutate({
        name: title,
        doc: store.get(docAtom),
      })
    })

    return () => {
      return unsub()
    }
  }, [title, loadDocQuery.isLoading])

  useEffect(() => {
    if (!loadDocQuery.isLoading && loadDocQuery.data) {
      store.set(docAtom, loadDocQuery.data)
    }
  }, [loadDocQuery.data])

  const navigate = useNavigate()

  useCustomEventListener(
    'cm-wiki-link-click',
    (event: CustomEvent<WikiLinkClickEventDetail>) => {
      navigate({
        to: '/n/$title',
        params: {
          title: event.detail.link,
        },
      }).then(() => {})
    }
  )

  return (
    <Provider store={store}>
      <div className="w-full flex p-8">
        <div className="w-[50%]">
          {loadDocQuery.isLoading ? <div>Loading...</div> : <TEditor />}
        </div>
        <div className="w-[50%]">
          <Tabs>
            <Tab key="time" title="Time View">
              <TimeView />
            </Tab>
            <Tab key="raw" title="Document Content">
              <RawDocument />
            </Tab>
            <Tab key="tree" title="Tree Document">
              <TreeDocument />
            </Tab>
            <Tab key="dev" title="PG Repl">
              <PgliteRepl />
            </Tab>
          </Tabs>
        </div>
      </div>
    </Provider>
  )
}
