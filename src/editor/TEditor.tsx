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
import { Checkbox } from '@/components/ui/checkbox'
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
