import * as React from 'react'
import { BadgeButton } from '@/components/ui/Badge'

import {
  Dialog,
  DialogHeader,
  DialogTrigger,
  DialogOverlay,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import type { LineWithIdx } from './line-editor'
import { useDocLine } from './state'
import { Input } from '@/components/ui/input'
import parseDuration from 'parse-duration'
import { Button } from '@/components/ui/button'
import { DialogClose } from '@radix-ui/react-dialog'
import { ClockIcon, PlayIcon, StopIcon } from '@heroicons/react/16/solid'
import { useCallback, useRef } from 'react'
import { setDetailTitle } from '@/lib/title'
import { trpc } from '@/trpc/client'

const useEventListener = (event: string, handler: (event: Event) => void) => {
  React.useEffect(() => {
    window.addEventListener(event, handler)
    return () => window.removeEventListener(event, handler)
  }, [event, handler])
}

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

const formatTimeDisplay = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

type TimerMode = 'stopwatch' | 'countdown' | 'manual'

type TimerState = {
  mode: TimerMode
  isRunning: boolean
  startTime: number | null
  targetDuration: number
  elapsedTime: number
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

  const execHook = trpc.execHook.useMutation();
  const [, setLine] = useDocLine(lineInfo.lineIdx)

  const [timerState, setTimerState] = React.useState<TimerState>({
    mode: 'stopwatch',
    isRunning: false,
    startTime: null,
    targetDuration: 25 * 60, // 25 minutes default
    elapsedTime: 0,
  })

  const [timeInput, setTimeInput] = React.useState(renderTime(time))
  const [countdownInput, setCountdownInput] = React.useState('25m')
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const lineContent = lineInfo.line.mdContent;

  // Timer management functions
  const startTimer = useCallback(() => {
    setTimerState(prev => ({
      ...prev,
      isRunning: true,
      startTime: Date.now(),
      elapsedTime: prev.mode === 'countdown' ? prev.targetDuration : 0,
    }))

    setDetailTitle(lineContent);

    intervalRef.current = setInterval(() => {
      setTimerState(prev => {
        if (!prev.isRunning) return prev

        const now = Date.now()
        const elapsed = Math.floor((now - (prev.startTime || now)) / 1000)

        if (prev.mode === 'stopwatch') {
          return { ...prev, elapsedTime: elapsed }
        } else if (prev.mode === 'countdown') {
          const remaining = Math.max(0, prev.targetDuration - elapsed)
          if (remaining === 0) {
            // Countdown finished - save the full target duration
            clearInterval(intervalRef.current!)
            setLine((line) => {
              line.datumTime = (line.datumTime || 0) + prev.targetDuration
            })
            alert('Timer completed!')
            return { ...prev, isRunning: false, elapsedTime: 0, startTime: null }
          }
          return { ...prev, elapsedTime: remaining }
        }
        return prev
      })
    }, 1000)

    execHook.mutate({
      hook: 'timer-start', argument: {
        line: lineInfo.line.mdContent,
      }
    })
  }, [lineContent, execHook, lineInfo.line.mdContent, setLine])

  const stopTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    execHook.mutate({
      hook: 'timer-stop', argument: {
        line: lineInfo.line.mdContent,
      }
    })

    setDetailTitle(null);

    setTimerState(prev => {
      if (prev.mode === 'stopwatch' && prev.isRunning) {
        // Calculate final elapsed time for stopwatch
        const finalElapsed = prev.startTime ? Math.floor((Date.now() - prev.startTime) / 1000) : prev.elapsedTime
        setLine((line) => {
          line.datumTime = finalElapsed
        })
      } else if (prev.mode === 'countdown' && prev.isRunning) {
        // For countdown, save the original target duration (what was actually "worked")
        const timeWorked = prev.startTime ? Math.floor((Date.now() - prev.startTime) / 1000) : 0
        setLine((line) => {
          line.datumTime = Math.min(timeWorked, prev.targetDuration)
        })
      }

      return {
        ...prev,
        isRunning: false,
        elapsedTime: 0,
        startTime: null,
      }
    })
  }, [setLine, execHook, lineInfo.line.mdContent])

  const resetTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setTimerState(prev => ({
      ...prev,
      isRunning: false,
      elapsedTime: 0,
      startTime: null,
    }))
  }, [])

  const setManualTime = useCallback(() => {
    const duration = parseTime(timeInput)
    if (duration !== null) {
      setLine((line) => {
        line.datumTime = duration
      })
    }
  }, [timeInput, setLine])

  const setCountdownDuration = useCallback(() => {
    const duration = parseTime(countdownInput)
    if (duration !== null) {
      setTimerState(prev => ({
        ...prev,
        targetDuration: duration,
      }))
    }
  }, [countdownInput])

  React.useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  useEventListener('beforeunload', (event: BeforeUnloadEvent) => {
    if (timerState.isRunning) {
      event.preventDefault()
      event.returnValue = 'You have an active timer running. Are you sure you want to leave?'
    }
  })

  const displayTime = timerState.isRunning ? timerState.elapsedTime : time

  return (
    <Dialog>
      <DialogTrigger asChild>
        <div className="ml-1">
          <BadgeButton
            className="cursor-pointer whitespace-nowrap"
            badgeClassName="px-[4px] py-[1px]"
          >
            <div className="flex items-center gap-1">
              <ClockIcon style={{ width: '16px', height: '16px' }} />
              {(time > 0 || timerState.isRunning) && (
                <div className={timerState.isRunning ? 'text-green-400' : ''}>
                  {timerState.isRunning ? formatTimeDisplay(displayTime) : renderTime(time)}
                </div>
              )}
              {timerState.isRunning && (
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              )}
            </div>
          </BadgeButton>
        </div>
      </DialogTrigger>
      <DialogOverlay>
        <DialogContent className="text-white w-96 h-[500px]">
          <DialogHeader className="flex flex-col gap-2">
            <DialogTitle>Timer</DialogTitle>

            {/* Mode Selection */}
            <div className="flex justify-between items-center border-b border-gray-600 pb-2">
              <div className="flex gap-2">
                {(['stopwatch', 'countdown', 'manual'] as TimerMode[]).map((mode) => (
                  <Button
                    key={mode}
                    {...(timerState.mode === mode ? { color: 'indigo' } : { outline: true })}
                    onClick={() => {
                      resetTimer()
                      setTimerState(prev => ({ ...prev, mode }))
                    }}
                    className="capitalize text-xs px-3 py-1"
                  >
                    {mode}
                  </Button>
                ))}
              </div>

            </div>
            <div className="text-lg text-gray-400">{lineContent}</div>
          </DialogHeader>
          <div className="text-primary flex flex-col gap-4 h-full overflow-hidden">


            {/* Timer Content - Fixed height container */}
            <div className="flex-1 flex flex-col justify-center">
              {/* Stopwatch Mode */}
              {timerState.mode === 'stopwatch' && (
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="text-4xl font-mono mb-2">
                      {formatTimeDisplay(timerState.isRunning ? timerState.elapsedTime : 0)}
                    </div>
                    <div className="text-sm text-gray-400">
                      Stopwatch Mode - Counts up from zero
                    </div>
                  </div>
                  <div className="flex gap-2 justify-center">
                    {!timerState.isRunning ? (
                      <Button onClick={startTimer} className="flex items-center gap-2">
                        <PlayIcon className="w-4 h-4" />
                        Start
                      </Button>
                    ) : (
                      <Button onClick={stopTimer} className="flex items-center gap-2">
                        <StopIcon className="w-4 h-4" />
                        Stop & Save
                      </Button>
                    )}
                    <Button onClick={resetTimer} outline>
                      Reset
                    </Button>
                  </div>
                </div>
              )}

              {/* Countdown Mode */}
              {timerState.mode === 'countdown' && (
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="text-4xl font-mono mb-2">
                      {formatTimeDisplay(timerState.isRunning ? timerState.elapsedTime : timerState.targetDuration)}
                    </div>
                    <div className="text-sm text-gray-400">
                      Countdown Mode - Counts down to zero
                    </div>
                  </div>
                  {!timerState.isRunning && (
                    <div className="space-y-3">
                      <label className="text-sm text-gray-400">Set Duration:</label>
                      <div className="flex gap-2">
                        <Input
                          type="text"
                          value={countdownInput}
                          onChange={(e) => setCountdownInput(e.target.value)}
                          placeholder="e.g., 25m, 1h 30m"
                          className="flex-1"
                        />
                        <Button onClick={setCountdownDuration} outline>
                          Set
                        </Button>
                      </div>
                      {parseTime(countdownInput) === null && countdownInput && (
                        <div className="text-red-400 text-sm">
                          Unable to parse duration. Try: 25m, 1h 30m, etc.
                        </div>
                      )}
                    </div>
                  )}
                  <div className="flex gap-2 justify-center">
                    {!timerState.isRunning ? (
                      <Button onClick={startTimer} className="flex items-center gap-2">
                        <PlayIcon className="w-4 h-4" />
                        Start Countdown
                      </Button>
                    ) : (
                      <Button onClick={stopTimer} className="flex items-center gap-2">
                        <StopIcon className="w-4 h-4" />
                        Stop
                      </Button>
                    )}
                    <Button onClick={resetTimer} outline>
                      Reset
                    </Button>
                  </div>
                </div>
              )}

              {/* Manual Mode */}
              {timerState.mode === 'manual' && (
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="text-2xl font-mono mb-2 text-gray-400">
                      Manual Entry
                    </div>
                    <div className="text-sm text-gray-400">
                      Enter time directly without running a timer
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm text-gray-400">Enter Time:</label>
                      <Input
                        type="text"
                        value={timeInput}
                        onChange={(e) => setTimeInput(e.target.value)}
                        placeholder="e.g., 2h 30m, 45m, 1h"
                      />
                      {parseTime(timeInput) === null && timeInput && (
                        <div className="text-red-400 text-sm">
                          Unable to parse duration. Try: 2h 30m, 45m, etc.
                        </div>
                      )}
                    </div>
                    <DialogClose asChild>
                      <Button
                        onClick={setManualTime}
                        disabled={parseTime(timeInput) === null}
                        className="w-full"
                      >
                        Set Time
                      </Button>
                    </DialogClose>
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </DialogOverlay>
    </Dialog>
  )
}
