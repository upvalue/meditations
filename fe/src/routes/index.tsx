import { TEditor } from '@/editor/TEditor'
import { Tabs, Tab } from '@heroui/react'
import { createFileRoute } from '@tanstack/react-router'
import { docAtom, docIterationAtom } from '@/editor/state'
import { useAtom } from 'jotai'
import { analyzeDoc, type ZTreeLine } from '@/editor/schema'
import { uniq } from 'lodash-es'

export const Route = createFileRoute('/')({
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
  const [docIteration] = useAtom(docIterationAtom)
  return (
    <div className="w-full flex p-8">
      <div className="w-[50%]">
        <TEditor key={docIteration} />
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
          <Tab key="error" title="No Error">
            <div className="whitespace-pre-wrap font-mono">No errors</div>
          </Tab>
        </Tabs>
      </div>
    </div>
  )
}
