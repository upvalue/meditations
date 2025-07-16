import { useState } from 'react'
import { TEditor } from '@/editor/TEditor'
import { Tabs, Tab } from '@heroui/react'
import { createFileRoute } from '@tanstack/react-router'
import { docAtom } from '@/editor/TEditor'
import { useAtom } from 'jotai'

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

function RouteComponent() {
  return (
    <div className="w-full flex p-8">
      <div className="w-[50%]">
        <TEditor />
      </div>
      <div className="w-[50%]">
        <Tabs>
          <Tab key="raw" title="Document Content">
            <RawDocument />
          </Tab>
          <Tab key="error" title="No Error">
            <div className="whitespace-pre-wrap font-mono">No errors</div>
          </Tab>
        </Tabs>
      </div>
    </div>
  )
}
