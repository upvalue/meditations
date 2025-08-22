import { useAtomValue, useSetAtom } from 'jotai'
import { docAtom, focusedLineAtom } from './state'
import { Checkbox } from '@/components/ui/Checkbox'
import { Circle, CircleDot } from 'lucide-react'
import { useCodeMirror, type LineWithIdx } from './line-editor'
import { TimerBadge } from './TimerBadge'
import { cn } from '@/lib/utils'
import type { CollapseState } from './collapse'

type ELineProps = LineWithIdx & {
  timestamp: string | null
  collapseState: CollapseState
}

/**
 * The individual line editor React component. Note that the bulk of
 * the logic is contained in the line-editor.ts file which handles
 * CodeMirror integration; this component handles rendering React
 * components and other functionality that doesn't need to live in
 * the codemirror layer
 */
export const ELine = (lineInfo: ELineProps) => {
  const { cmRef } = useCodeMirror(lineInfo)

  // Codemirror of course doesn't receive recreated
  // callbacks with new component state; this table
  // lets us update them on the fly

  const { line, timestamp, collapseState } = lineInfo

  const setDoc = useSetAtom(docAtom)

  const isFocused = useAtomValue(focusedLineAtom) === lineInfo.lineIdx

  return (
    <div
      className={cn(
        'flex gap-2 w-full',
        collapseState === 'collapsed' && 'hidden',
        isFocused && 'ELine-focused'
      )}
    >
      <div className="ELine-gutter items-start pt-1 font-mono text-zinc-600 text-sm flex-shrink-0 justify-end flex">
        {timestamp || ''}
      </div>
      <div
        className="flex items-start flex-grow"
        style={{
          marginLeft: `${line.indent * 16}px`,
        }}
      >
        {collapseState === 'collapse-start' ? (
          <CircleDot width={8} height={8} className="mt-2.5" />
        ) : (
          <Circle width={8} height={8} className="mt-2.5" />
        )}
        {line.datumTime !== undefined && (
          <TimerBadge lineInfo={lineInfo} time={line.datumTime} />
        )}
        {line.datumTaskStatus && (
          <Checkbox
            className="mt-2 ml-2"
            tabIndex={-1}
            checked={line.datumTaskStatus === 'complete'}
            onChange={(e) => {
              // TOOD: This pattern repeats itself and could be turned into a hook
              setDoc((draft) => {
                draft.children[lineInfo.lineIdx].datumTaskStatus = e
                  ? 'complete'
                  : 'incomplete'
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
