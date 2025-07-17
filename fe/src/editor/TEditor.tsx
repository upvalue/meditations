import { useEffect, useRef } from 'react'
import type { ZDoc, ZLine } from './schema'

import './TEditor.css'
import { Icon } from '@/Icon'
import { ListBulletIcon, BeakerIcon } from '@heroicons/react/20/solid'

import { atom, useAtom } from 'jotai'

import { useCodeMirror, type LineInfo } from './codemirror-hook'
import { produce } from 'immer'

// TODO: Consider renaming doc to outline in order
// to reduce conflicts with builtin codemirror concepts

export const docAtom = atom<ZDoc>({
  type: 'doc',
  children: [
    {
      type: 'line',
      mdContent: 'The world is #test',
      indent: 0,
    },
    {
      type: 'line',
      mdContent: 'Task test',
      indent: 1,
      taskStatus: 'incomplete',
    },
    {
      type: 'line',
      mdContent: 'Number 2 #test',
      indent: 0,
    },
    {
      type: 'line',
      mdContent: 'Task test 2',
      taskStatus: 'incomplete',
      indent: 1,
    },
  ],
})

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
      <div className="cm-editor-container w-full" ref={cmRef} />
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

  useEffect(() => {
    if (!containerRef.current) return

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          // @ts-expect-error
          if (mutation.target.classList.contains('cm-content')) {
            // @ts-expect-error
            mutation.target.focus()
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
