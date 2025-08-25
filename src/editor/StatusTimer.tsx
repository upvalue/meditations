import { useAtom } from 'jotai'
import { useCallback, useRef, useEffect } from 'react'
import { StopIcon, ExclamationTriangleIcon } from '@heroicons/react/16/solid'
import { Button } from '@/components/ui/button'
import { globalTimerAtom } from './state'
import { trpc } from '@/trpc/client'
import { setDetailTitle } from '@/lib/title'

const formatTimeDisplay = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

export const StatusTimer = () => {
  const [globalTimer, setGlobalTimer] = useAtom(globalTimerAtom)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const execHook = trpc.execHook.useMutation()

  const stopTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    execHook.mutate({
      hook: 'timer-stop',
      argument: {
        line: globalTimer.lineContent || '',
      }
    })

    setDetailTitle(null)

    setGlobalTimer({
      isActive: false,
      lineIdx: null,
      lineContent: null,
      mode: 'stopwatch',
      startTime: null,
      targetDuration: 25 * 60,
      elapsedTime: 0,
    })
  }, [globalTimer.lineContent, setGlobalTimer, execHook])

  useEffect(() => {
    if (globalTimer.isActive && !intervalRef.current) {
      intervalRef.current = setInterval(() => {
        setGlobalTimer(prev => {
          if (!prev.isActive) return prev

          const now = Date.now()
          const elapsed = Math.floor((now - (prev.startTime || now)) / 1000)

          if (prev.mode === 'stopwatch') {
            return { ...prev, elapsedTime: elapsed }
          } else if (prev.mode === 'countdown') {
            const remaining = Math.max(0, prev.targetDuration - elapsed)
            return { ...prev, elapsedTime: remaining }
          }
          return prev
        })
      }, 1000)
    } else if (!globalTimer.isActive && intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [globalTimer.isActive, setGlobalTimer])

  if (!globalTimer.isActive) {
    return null
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <Button
        onClick={stopTimer}
        className="p-1 hover:bg-zinc-700 rounded"
      >
        <StopIcon className="w-4 h-4 text-red-400" />
      </Button>
      <div className="flex items-center gap-1 text-green-400">
        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
        <span className="font-mono">{formatTimeDisplay(globalTimer.elapsedTime)}</span>
      </div>
      <div className="text-zinc-400 truncate max-w-[200px]">
        {globalTimer.lineContent}
      </div>
    </div>
  )
}