import { createFileRoute } from '@tanstack/react-router'
import '../App.css'
import { TEditor } from '@/editor/TEditor'
import { Tabs, Tab } from '@heroui/react'
import { useState } from 'react'

export const Route = createFileRoute('/')({
  component: App,
})

function App() {
  const [doc, setDoc] = useState<any>({})
  return (
    <>
      <div className="w-full h-full flex p-8">
        <div className="w-[50%]">
          <TEditor
            onDocChange={(doc) => {
              setDoc(doc)
            }}
          />
        </div>
        <div className="w-[50%]">
          <Tabs>
            <Tab key="raw" title="Document Content">
              <div className="whitespace-pre-wrap font-mono">
                {JSON.stringify(doc, null, 2)}
              </div>
            </Tab>
            <Tab key="stuff" title="Test">
              BIG STUFF
            </Tab>
          </Tabs>
        </div>
      </div>
    </>
  )
}
