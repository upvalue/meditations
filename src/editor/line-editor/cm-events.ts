import { TypedEventEmitter, useEventListener } from '@/lib/events'
import type { LineColor } from '../schema'

export type TagClickEventDetail = {
  name: string
}

export type WikiLinkClickEventDetail = {
  link: string
}

export type LineStatusEvent = {
  lineIdx: number
}

export type LineTimerEvent = {
  lineIdx: number
}

export type LineCollapseToggleEvent = {
  lineIdx: number
}

export type LineColorChangeEvent = {
  lineIdx: number
  color: LineColor | null
}

type CodemirrorEvents = {
  tagClick: TagClickEventDetail
  wikiLinkClick: WikiLinkClickEventDetail
  lineTimerAdd: LineTimerEvent
  lineTagToggle: LineStatusEvent
  lineCollapseToggle: LineCollapseToggleEvent
  lineColorChange: LineColorChangeEvent
}

const codemirrorEmitter = new TypedEventEmitter<CodemirrorEvents>()

declare global {
  interface Window {
    __codemirrorEmitter: TypedEventEmitter<CodemirrorEvents>
  }
}
window.__codemirrorEmitter = codemirrorEmitter

export const useCodemirrorEvent = <K extends keyof CodemirrorEvents>(
  event: K,
  handler: CodemirrorEvents[K] extends undefined
    ? () => void
    : (data: CodemirrorEvents[K]) => void
) => {
  useEventListener(codemirrorEmitter, event, handler)
}

export const emitCodemirrorEvent = <K extends keyof CodemirrorEvents>(
  event: K,
  ...args: CodemirrorEvents[K] extends undefined
    ? []
    : [data: CodemirrorEvents[K]]
) => {
  codemirrorEmitter.emit(event, ...args)
}

type LineSpecificEvents = {
  [K in keyof CodemirrorEvents]: CodemirrorEvents[K] extends { lineIdx: number }
    ? K
    : never
}[keyof CodemirrorEvents]

/**
 * Listens for events for a speciifc line (ignores events for other lines)
 */
export const useLineEvent = <K extends LineSpecificEvents>(
  event: K,
  lineIdx: number,
  handler: (data: CodemirrorEvents[K]) => void
) => {
  const wrappedHandler = (data: CodemirrorEvents[K]) => {
    if (
      (data as CodemirrorEvents[K] & { lineIdx: number }).lineIdx !== lineIdx
    ) {
      return
    }
    handler(data)
  }

  useCodemirrorEvent(
    event,
    wrappedHandler as CodemirrorEvents[K] extends undefined
      ? () => void
      : (data: CodemirrorEvents[K]) => void
  )
}
