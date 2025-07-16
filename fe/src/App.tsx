import React from 'react'
import { TEditor } from '@/editor/TEditor'
import { Tabs, Tab, Alert } from '@heroui/react'
import { useState } from 'react'
import { z } from 'zod'
import { zdoc, znode } from './editor/ZodSchema'

const parseDoc = (doc: any): [z.infer<typeof zdoc> | null, string | null] => {
  try {
    const parsed = zdoc.parse(doc)
    return [parsed, null]
  } catch (e: any) {
    console.error(e)
    return [null, e.toString()]
  }
}

// const traverseDoc = (doc: z.infer<typeof zdoc>) => {}

const traverseNode = (node: any, fn: (node: z.infer<typeof znode>) => void) => {
  if (!!node.content) {
    for (const child of node.content) {
      fn(child as z.infer<typeof znode>)
      traverseNode(child, fn)
    }
  }
}

const nodeChildren = (node: any): z.infer<typeof znode>[] => {
  if (!!node.content) {
    return node.content
  }
  return []
}

const traverseDoc = (
  doc: z.infer<typeof zdoc>,
  fn: (node: z.infer<typeof znode>) => void
) => {
  for (const line of doc.content) {
    traverseNode(line, fn)
  }
}

// Component that catches and reports all errors that occur underneath it
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  {
    error: any
    errorInfo: any
  }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = {
      error: null,
      errorInfo: null,
    }
  }
  componentDidCatch(error: any, errorInfo: any) {
    this.setState({ error, errorInfo })
  }
  render() {
    if (this.state.error) {
      return <Alert description={this.state.error.toString()} />
    }
    return this.props.children
  }
}

const TimeView = ({ doc }: { doc: z.infer<typeof zdoc> }) => {
  const tags: string[] = []

  traverseDoc(doc, (node) => {
    if (node.type === 'paragraph') {
      nodeChildren(node).forEach((n) => {
        if (n.type === 'tag') {
          if (!tags.includes(n.attrs.name)) {
            tags.push(n.attrs.name)
          }
        }
      })
    }
  })

  return (
    <div>
      {tags.map((t) => (
        <div key={t}>{t}</div>
      ))}
    </div>
  )
}

export function App() {
  const [doc, setDoc] = useState<z.infer<typeof zdoc> | null>(null)
  const [rawDoc, setRawDoc] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  return (
    <>
      <div className="w-full flex p-8">
        <div className="w-[50%]">
          <TEditor
            onDocChange={(doc) => {
              const [parsedDoc, error] = parseDoc(doc)
              setRawDoc(doc)
              setDoc(parsedDoc)
              setError(error)
            }}
          />
        </div>
        <div className="w-[50%]">
          <Tabs>
            <Tab key="time-view" title="Time View">
              <ErrorBoundary>{doc && <TimeView doc={doc} />}</ErrorBoundary>
            </Tab>
            <Tab key="raw" title="Document Content">
              <div className="whitespace-pre-wrap font-mono">
                {JSON.stringify(rawDoc, null, 2)}
              </div>
            </Tab>
            <Tab key="error" title={error ? 'Error' : 'No Error'}>
              <div className="whitespace-pre-wrap font-mono">{error}</div>
            </Tab>
          </Tabs>
        </div>
      </div>
    </>
  )
}
