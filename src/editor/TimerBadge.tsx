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
import type { LineWithIdx } from './line-editor'
import { docAtom, useDocLine } from './state'
import { useAtom } from 'jotai'
import { Input } from '@/components/ui/input'
import parseDuration from 'parse-duration'
import { Button } from '@/components/ui/button'
import { DialogClose } from '@radix-ui/react-dialog'

const renderTime = (seconds: number) => {
  if (seconds === 0) return '0s'

  const days = Math.floor(seconds / (24 * 60 * 60))
  const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60))
  const minutes = Math.floor((seconds % (60 * 60)) / 60)
  const remainingSeconds = seconds % 60

  const parts = []
  if (days > 0) parts.push(`${days}d`)
  if (hours > 0) parts.push(`${hours}h`)
  if (minutes > 0) parts.push(`${minutes}m`)
  if (remainingSeconds > 0 && parts.length === 0)
    parts.push(`${remainingSeconds}s`)

  return parts.join(' ')
}

const parseTime = (time: string) => parseDuration(time, 's')

/**
 * Timer badge; shows time spent and allows user to interact
 * with the timer
 */
export const TimerBadge = ({
  lineInfo,
  time,
}: {
  lineInfo: LineWithIdx
  time: number
}) => {
  const [line, setLine] = useDocLine(lineInfo.lineIdx)

  const [timeInput, setTimeInput] = React.useState(renderTime(time))
  const [activeTimerInterval, setActiveTimerInterval] =
    React.useState<NodeJS.Timeout | null>(null)

  const [activeTimer, setActiveTimer] = React.useState<any>(false)
  const [activeTimerStart, setActiveTimerStart] = React.useState(0)
  const [refreshCount, setRefreshCount] = React.useState(0)

  return (
    <Dialog>
      <DialogTrigger asChild>
        <BadgeButton className="cursor-pointer whitespace-nowrap">
          <div className="flex items-start justify-start gap-2">
            <Clock7 className="w-4 h-4" />
            <div>{time > 0 && renderTime(time)}</div>
          </div>
        </BadgeButton>
      </DialogTrigger>
      <DialogOverlay>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-primary">Timer</DialogTitle>
          </DialogHeader>
          <div className="text-primary flex flex-col gap-4">
            <div>Line: {lineInfo.line.mdContent}</div>
            <h1>Set timer manually</h1>
            <Input
              type="text"
              value={timeInput}
              onChange={(e) => {
                setTimeInput(e.target.value)
              }}
            />
            <div>
              {parseTime(timeInput) === null &&
                'Unable to parse duration. Try something like 5h 30m'}
            </div>
            <DialogClose asChild>
              <Button
                onClick={() => {
                  setLine((line) => {
                    const duration = parseTime(timeInput)
                    if (duration === null) return
                    console.log(duration)
                    line.datumTime = duration
                    // Close dialog
                  })
                }}
              >
                Set time
              </Button>
            </DialogClose>
            <h1>Start/Stop timer</h1>
            <Button
              onClick={() => {
                setActiveTimer(true)
                setActiveTimerStart(Date.now())
                setActiveTimerInterval(
                  setInterval(() => {
                    setRefreshCount((count) => count + 1)
                  }, 1000)
                )
              }}
            >
              Start timer
            </Button>
            <Button
              onClick={() => {
                if (activeTimerInterval) {
                  setTimeInput(
                    renderTime(
                      Math.floor((Date.now() - activeTimerStart) / 1000)
                    )
                  )
                  clearInterval(activeTimerInterval)
                  setActiveTimerInterval(null)
                }
              }}
            >
              Stop timer
            </Button>
            <div>
              {activeTimer &&
                renderTime(Math.floor((Date.now() - activeTimerStart) / 1000))}
            </div>
          </div>
        </DialogContent>
      </DialogOverlay>
    </Dialog>
  )
}
