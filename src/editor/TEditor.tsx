import { useRef, useMemo } from 'react'

import './TEditor.css'

import { useAtom } from 'jotai'

import { useCodemirrorEvent } from './line-editor'
import { docAtom } from './state'
import { generateGutterTimestamps } from './gutters'
import { ELine } from './ELine'

/**
 * The top level editor component.
 */
export const TEditor = () => {
  const [doc] = useAtom(docAtom)
  const containerRef = useRef<HTMLDivElement>(null)

  const gutterTimestamps = useMemo(() => {
    return generateGutterTimestamps(doc.children)
  }, [doc.children])

  useCodemirrorEvent(
    'tagClick',
    (event) => {
      console.log('Tag clicked', event.name)
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
