import { TEditor } from '@/editor/TEditor'
import { createFileRoute } from '@tanstack/react-router'
import { docAtom } from '@/editor/state'
import { docMake, lineMake } from '@/editor/schema'
import { Provider } from 'jotai'
import { useHydrateAtoms } from 'jotai/utils'
import { EditorLayout } from '@/layout/EditorLayout'
import { Panel } from '@/panel/Panel'
import { TitleBar } from '@/editor/TitleBar'

export const Route = createFileRoute('/lab')({
  component: RouteComponent,
})





const ExampleDoc = ({ children }: { children: React.ReactNode }) => {
  useHydrateAtoms([
    [
      docAtom,
      docMake([
        {
          ...lineMake(0, 'The world is #test'),
        },
        {
          ...lineMake(0, 'Number 2 #test'),
        },
        {
          ...lineMake(1, '[[WikiLink]]'),
        },
      ]),
    ],
  ])

  return children
}

function RouteComponent() {
  return (
    <Provider>
      <ExampleDoc>
        <EditorLayout
          editor={
            <>
              <TitleBar title="Lab" allowTitleEdit={false} />
              <TEditor />
            </>
          }
          sidepanel={<Panel />}
        />
      </ExampleDoc>
    </Provider>
  )
}
