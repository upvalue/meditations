import { useRef, useMemo } from 'react'

import './TEditor.css'
import { Icon } from '@/Icon'
import { ListBulletIcon } from '@heroicons/react/20/solid'

import { useAtom } from 'jotai'

import {
  useCodeMirror,
  type LineInfo,
  type TagClickEventDetail,
} from './line-editor'
import { produce } from 'immer'
import { docAtom } from './state'
import { useCustomEventListener } from '@/hooks/useCustomEventListener'
import { generateGutterTimestamps } from './gutters'

const ELine = (lineInfo: LineInfo & { timestamp: string | null }) => {
  const { cmRef } = useCodeMirror(lineInfo)

  // Codemirror of course doesn't receive recreated
  // callbacks with new component state; this table
  // lets us update them on the fly

  const { line, timestamp } = lineInfo

  const [, setDoc] = useAtom(docAtom)

  return (
    <div className="flex items-center gap-2 w-full">
      <div className="ELine-gutter font-mono text-zinc-600 text-sm flex-shrink-0 justify-end flex">
        {timestamp || ''}
      </div>
      <div
        className="flex items-start flex-grow"
        style={{
          marginLeft: `${line.indent * 16}px`,
        }}
      >
        <Icon icon={ListBulletIcon} className="mt-2" />
        {line.taskStatus && (
          <input
            type="checkbox"
            tabIndex={-1}
            checked={line.taskStatus === 'complete'}
            onChange={(e) => {
              // TOOD: This pattern repeats itself and could be turned into a hook
              setDoc((recentDoc) => {
                return produce(recentDoc, (draft) => {
                  draft.children[lineInfo.lineIdx].taskStatus = e.target.checked
                    ? 'complete'
                    : 'incomplete'
                })
              })
            }}
          />
        )}
        <div
          className="cm-editor-container w-full"
          ref={cmRef}
          data-line-idx={lineInfo.lineIdx}
        />
      </div>
    </div>
  )
}

export const TEditor = () => {
  const [doc] = useAtom(docAtom)
  const containerRef = useRef<HTMLDivElement>(null)

  const gutterTimestamps = useMemo(() => {
    return generateGutterTimestamps(doc.children)
  }, [doc.children])

  useCustomEventListener(
    'cm-tag-click',
    (event: CustomEvent<TagClickEventDetail>) => {
      console.log('Tag clicked', event.detail.name)
    }
  )

  return (
    <div ref={containerRef}>
      {doc.children.map((l, i) => (
        <ELine key={i} line={l} lineIdx={i} timestamp={gutterTimestamps[i]} />
      ))}
    </div>
  )
}

export { docAtom }
