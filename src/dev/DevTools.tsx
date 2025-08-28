import { useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { useAtom } from 'jotai'
import { analyzeDoc, zdoc } from '@/editor/schema'
import { docAtom } from '@/editor/state'
import { Button } from '@/components/ui/button'
import { PgliteDevtools } from './PgliteDevtools'

const RawDocument = () => {
  const [doc, setDoc] = useAtom(docAtom)
  const [message, setMessage] = useState<string>('')

  const copyDocumentJSON = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(doc, null, 2))
      setMessage('Document JSON copied to clipboard!')
      setTimeout(() => setMessage(''), 2000)
    } catch {
      setMessage('Failed to copy to clipboard')
      setTimeout(() => setMessage(''), 2000)
    }
  }

  const pasteDocumentJSON = async () => {
    try {
      const text = await navigator.clipboard.readText()
      const parsedDoc = JSON.parse(text)

      // Validate the JSON structure
      const validatedDoc = zdoc.parse(parsedDoc)

      setDoc(validatedDoc)
      setMessage('Document JSON pasted and applied!')
      setTimeout(() => setMessage(''), 2000)
    } catch (error) {
      if (error instanceof SyntaxError) {
        setMessage('Invalid JSON format')
      } else {
        setMessage('Invalid document structure')
      }
      setTimeout(() => setMessage(''), 3000)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-center">
        <Button onClick={copyDocumentJSON} outline>
          Copy JSON
        </Button>
        <Button onClick={pasteDocumentJSON} outline>
          Paste JSON
        </Button>
        {message && (
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {message}
          </span>
        )}
      </div>
      <div className="whitespace-pre-wrap font-mono">
        {JSON.stringify(doc, null, 2)}
      </div>
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



export const DevTools = () => {
  const usingPglite = !!window.dbHandle;

  const router = useRouter()
  return (
    <Tabs>
      <TabsList>
        <TabsTrigger value="raw">Document Content</TabsTrigger>
        <TabsTrigger value="tree">Tree Document</TabsTrigger>
        {usingPglite &&
          <TabsTrigger value="pglite">pglite</TabsTrigger>
        }
        <TabsTrigger value="tanstackdev">TanStack Devtools</TabsTrigger>
      </TabsList>
      <TabsContent value="raw">
        <RawDocument />
      </TabsContent>
      <TabsContent value="tree">
        <TreeDocument />
      </TabsContent>
      {usingPglite &&
        <TabsContent value="pglite">
          <PgliteDevtools />
        </TabsContent>
      }
      <TabsContent value="tanstackdev">
        <TanStackRouterDevtoolsPanel router={router} />
      </TabsContent>
    </Tabs>
  )
}
