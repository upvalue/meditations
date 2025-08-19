import { TEditor } from '@/editor/TEditor'
import { toast } from 'sonner'
// import { Tabs, Tab } from '@heroui/react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { docAtom } from '@/editor/state'
import { createStore, useAtom } from 'jotai'
import { analyzeDoc, type ZTreeLine } from '@/editor/schema'
import { truncate, uniq } from 'lodash-es'
import { Provider } from 'jotai'
import { trpc } from '@/trpc'
import { createFileRoute, useNavigate, useRouter } from '@tanstack/react-router'
import { useEffect, useMemo, useRef } from 'react'
import { useCustomEventListener } from '@/hooks/useCustomEventListener'
import { PgliteRepl } from '@/dev/DevTools'
import {
  TanStackRouterDevtools,
  TanStackRouterDevtoolsPanel,
} from '@tanstack/react-router-devtools'
import type { WikiLinkClickEventDetail } from '@/editor/line-editor'
import { ModeLine } from '@/editor/ModeLine'

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

function RouteComponent() {
  const title = Route.useParams({
    select: (p) => p.title,
  })

  const router = useRouter()

  const updateDocMutation = trpc.updateDoc.useMutation({
    onError: (e) => {
      console.error(e)
      toast.error(
        `Error while updating document ${truncate(e.toString(), { length: 100 })}`
      )
    },
  })

  const store = useMemo(() => {
    const store = createStore()
    return store
  }, [])

  const loadDocQuery = trpc.loadDoc.useQuery({ name: title })
  // TODO Silently fails

  useEffect(() => {
    if (loadDocQuery.isLoading) {
      return
    }
    const unsub = store.sub(docAtom, () => {
      // Data hasn't changed, don't do anything
      if (store.get(docAtom) === loadDocQuery.data) {
        return
      }
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
      <div className="w-full h-full flex flex-col ">
        <ModeLine />
        <div className="flex flex-grow p-8">
          <div className="w-[60%]">
            <h1 className="text-zinc-500 text-2xl ml-[128px] mb-4">{title}</h1>
            {loadDocQuery.isLoading ? <div>Loading...</div> : <TEditor />}
          </div>
          <div className="w-[40%]">
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
          </div>
        </div>
      </div>
    </Provider>
  )
}
