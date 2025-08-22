import { atom, useAtom } from 'jotai'
import { withImmer } from 'jotai-immer'
import { lineMake, type ZDoc, type ZLine } from './schema'
import { useCallback } from 'react'

export const docAtom = withImmer(
  atom<ZDoc>({
    type: 'doc',
    children: [
      lineMake(0, 'The world is #test'),
      lineMake(0, 'Number 2 #test'),
      lineMake(1, '[[WikiLink]]'),
    ],
  } as any as ZDoc)
)

export const focusedLineAtom = atom<number | null>(null)

export const requestFocusLineAtom = atom({
  lineIdx: -1,
  pos: 0,
})

export const errorMessageAtom = atom<string | null>(null)

/**
 * Allows reading or modifying a specific line
 * in the document
 */
export const useDocLine = (
  lineIdx: number
): [ZLine, (callback: (line: ZLine) => void) => void] => {
  const [doc, setDoc] = useAtom(docAtom)

  const setLine = useCallback(
    (callback: (line: ZLine) => void) => {
      setDoc((draft) => {
        callback(draft.children[lineIdx])
      })
    },
    [lineIdx]
  )

  return [doc.children[lineIdx], setLine]
}
