import { TEditor } from '@/editor/TEditor'
import { createFileRoute } from '@tanstack/react-router'
import { docAtom } from '@/editor/state'
import { useAtom } from 'jotai'
import { analyzeDoc, type ZTreeLine } from '@/editor/schema'
import { uniq } from 'lodash-es'
import { Provider } from 'jotai'
import { useHydrateAtoms } from 'jotai/utils'
import { EditorLayout } from '@/layout/EditorLayout'
import { Panel } from '@/panel/Panel'
import { ControlBar } from '@/controls/ControlBar'

export const Route = createFileRoute('/lab')({
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

const ExampleDoc = ({ children }: { children: React.ReactNode }) => {
  useHydrateAtoms([
    [
      docAtom,
      {
        type: 'doc',
        children: [
          {
            type: 'line',
            mdContent: 'The world is #test',
            indent: 0,
            timeCreated: new Date().toISOString(),
            timeUpdated: new Date().toISOString(),
          },
          {
            type: 'line',
            mdContent: 'Number 2 #test',
            indent: 0,
            timeCreated: new Date().toISOString(),
            timeUpdated: new Date().toISOString(),
          },
          {
            type: 'line',
            mdContent: '[[WikiLink]]',
            indent: 1,
            timeCreated: new Date().toISOString(),
            timeUpdated: new Date().toISOString(),
          },
        ],
      },
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
              <ControlBar title="Lab" allowTitleEdit={false} />
              <TEditor />
            </>
          }
          sidepanel={<Panel />}
        />
      </ExampleDoc>
    </Provider>
  )
}
