import * as React from 'react'
import { Badge, BadgeButton } from '@/components/ui/Badge'

import { Clock7 } from 'lucide-react'

import {
  Dialog,
  DialogHeader,
  DialogTrigger,
  DialogOverlay,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import type { LineInfo } from './line-editor'
import { docAtom } from './state'
import { useAtom } from 'jotai'

/**
 * Timer badge; shows time spent and allows user to interact
 * with the timer
 */
export const TimerBadge = ({
  lineInfo,
  time,
}: {
  lineInfo: LineInfo
  time: number
}) => {
  const [doc] = useAtom(docAtom)
  return (
    <Dialog>
      <DialogTrigger asChild>
        <BadgeButton className="cursor-pointer">
          <Clock7 className="w-4 h-4" />
          {time > 0 && time}
        </BadgeButton>
      </DialogTrigger>
      <DialogOverlay>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-primary">Timer</DialogTitle>
          </DialogHeader>
          <div className="text-primary">Line: {lineInfo.line.mdContent}</div>
          <button
            type="button"
            className="text-primary"
            onClick={() => {
              console.log('set time to 5 hours')
            }}
          >
            set time to 5 hours
          </button>
        </DialogContent>
      </DialogOverlay>
    </Dialog>
  )
}
