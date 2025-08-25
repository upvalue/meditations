import { useAtomValue, useSetAtom } from 'jotai'
import { useEffect } from 'react'
import { docAtom } from './state'
import { errorMessageAtom } from './state'
import { Button } from '@headlessui/react'
import { X } from 'lucide-react'

export const StatusBar = () => {
  const doc = useAtomValue(docAtom)
  const errorMessage = useAtomValue(errorMessageAtom)
  const setErrorMessage = useSetAtom(errorMessageAtom)

  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => {
        setErrorMessage(null)
      }, 5000)

      return () => clearTimeout(timer)
    }
  }, [errorMessage, setErrorMessage])

  return (
    <div className="StatusBar w-full h-10 bg-zinc-900 px-[138px] flex items-center justify-between">
      <div>
        {errorMessage && (
          <div className="flex items-center gap-2">
            <div className="text-sm text-red-400">{errorMessage}</div>
            <Button
              onClick={() => setErrorMessage(null)}
              className="cursor-pointer"
            >
              <X className="w-4 h-4 " />
            </Button>
          </div>
        )}
      </div>
      <div className="text-sm text-zinc-400">lines: {doc.children.length}</div>
    </div>
  )
}
