import { TEditor } from '@/editor/TEditor'
import { toast } from 'sonner'
import { docAtom } from '@/editor/state'
import { createStore, useAtom, useSetAtom } from 'jotai'
import { analyzeDoc, type ZTreeLine } from '@/editor/schema'
import { truncate, uniq } from 'lodash-es'
import { Provider } from 'jotai'
import { trpc } from '@/trpc'
import { createFileRoute, useNavigate, useRouter } from '@tanstack/react-router'
import { useEffect, useMemo } from 'react'
import { useCodemirrorEvent } from '@/editor/line-editor'
import { EditorLayout } from '@/layout/EditorLayout'
import { Panel } from '@/panel/Panel'
import { TitleBar } from '@/editor/TitleBar'
import { StatusBar } from '@/editor/StatusBar'
import { setMainTitle } from '@/lib/title'

export const Route = createFileRoute('/n/$title')({
  component: RouteComponent,
})

function RouteComponent() {
  const title = Route.useParams({
    select: (p) => p.title,
  })

  useEffect(() => {
    setMainTitle(title)
  }, [title])

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

  useCodemirrorEvent('wikiLinkClick', (event) => {
    navigate({
      to: '/n/$title',
      params: {
        title: event.link,
      },
    }).then(() => { })
  })

  return (
    <Provider store={store}>
      <EditorLayout
        editor={
          <>
            <TitleBar title={title} allowTitleEdit={true} />
            <StatusBar />
            {loadDocQuery.isLoading ? <div>Loading...</div> : <TEditor />}
          </>
        }
        sidepanel={<Panel />}
      />
    </Provider>
  )
}
