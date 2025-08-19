import { useAtom } from 'jotai'
import { docAtom } from './state'
import { produce } from 'immer'
import { Checkbox } from '@/components/ui/checkbox'
import { Icon } from '@/Icon'
import { ListBulletIcon } from '@heroicons/react/20/solid'
import { useCodeMirror, type LineInfo } from './line-editor'
import { TimerBadge } from './TimerBadge'

/**
 * The individual line editor React component. Note that the bulk of
 * the logic is contained in the line-editor.ts file which handles
 * CodeMirror integration; this component mainly handles rendering React
 * stuff around it
 */
export const ELine = (lineInfo: LineInfo & { timestamp: string | null }) => {
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
