import { useCallback, useEffect, useRef } from 'react'
import type { ZDoc } from './schema'

import './TEditor.css'
import { Icon } from '@/Icon'
import { ListBulletIcon, BeakerIcon } from '@heroicons/react/20/solid'

import { atom, useAtom } from 'jotai'
import { useAtomCallback } from 'jotai/utils'

import { useCodeMirror, type LineInfo } from './codemirror-hook'
import { produce } from 'immer'
import { docAtom, focusLineAtom } from './state'

const ELine = (lineInfo: LineInfo) => {
  const { cmRef } = useCodeMirror(lineInfo)

  // Codemirror of course doesn't receive recreated
  // callbacks with new component state; this table
  // lets us update them on the fly

  const { line } = lineInfo

  const [, setDoc] = useAtom(docAtom)

  return (
    <div
      className="flex items-center gap-2 w-full"
      style={{
        marginLeft: `${line.indent * 16}px`,
      }}
    >
      <div
        className="cursor-pointer"
        onClick={() => {
          setDoc((recentDoc) => {
            return produce(recentDoc, (draft) => {
              draft.children[lineInfo.lineIdx].taskStatus = 'unset'
            })
          })
        }}
      >
        <Icon icon={BeakerIcon} />
      </div>
      <Icon icon={ListBulletIcon} />
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
  )
}

export const TEditor = () => {
  const [doc] = useAtom(docAtom)
  const containerRef = useRef<HTMLDivElement>(null)

  // Custom event listener
  useEffect(() => {
    const handler = (e: any) => {
      if (e.type === 'cm-tag-click') {
        console.log('Tag clicked', e.detail.name)
      }
    }
    window.addEventListener('cm-tag-click', handler)
    return () => window.removeEventListener('cm-tag-click', handler)
  }, [])

  useEffect(() => {
    console.log('Doc changed', doc)
  }, [doc])

  /**
   * Focus manager
   *
   * Handles managing focus when the document is altered
   * (e.g. lines added, removed)
   */
  const readFocusLine = useAtomCallback(
    useCallback((get) => get(focusLineAtom), [])
  )
  const [, setFocusLine] = useAtom(focusLineAtom)

  useEffect(() => {
    if (!containerRef.current) return

    const observer = new MutationObserver((mutations) => {
      const focusLine = readFocusLine()

      if (focusLine.lineIdx === -1) return

      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          // @ts-expect-error
          if (mutation.target.classList.contains('cm-content')) {
            let elt: any = mutation.target

            while (elt && !elt.getAttribute('data-line-idx')) {
              elt = elt.parentElement
            }

            if (!elt) return

            const lineIdx = parseInt(elt.getAttribute('data-line-idx'), 10)

            if (lineIdx === focusLine.lineIdx) {
              // Handle cursor position
              if (focusLine.pos >= 0 && mutation.target.cmView) {
                const { cmView } = mutation.target
                const view = cmView.view

                view.dispatch({
                  selection: { anchor: focusLine.pos },
                })
              }
              mutation.target.focus()
              console.log('Focusing on line', elt, lineIdx)
              // @ts-expect-error
            }

            setFocusLine({
              lineIdx: -1,
              pos: 0,
            })
          }
        }
      })
    })

    observer.observe(containerRef.current, {
      childList: true,
      subtree: true, // Watch all descendants
    })

    return () => {
      observer.disconnect()
    }
  }, [])

  return (
    <div ref={containerRef}>
      {doc.children.map((l, i) => (
        <ELine key={i} line={l} lineIdx={i} />
      ))}
    </div>
  )
}

export { docAtom }
