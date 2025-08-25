import { useEffect } from 'react'

/**
 * Custom hook for listening to custom events on the window object
 * The generic type T is automatically inferred from the callback parameter type
 * @param type - The event type to listen for
 * @param callback - The callback function to execute when the event is fired
 */
export const useCustomEventListener = <T>(
  type: string,
  callback: (event: CustomEvent<T>) => void,
  deps: any[] = []
) => {
  useEffect(() => {
    const handler = (event: Event) => {
      if (event.type === type && event instanceof CustomEvent) {
        callback(event as CustomEvent<T>)
      }
    }

    window.addEventListener(type, handler)

    return () => {
      window.removeEventListener(type, handler)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, callback, ...deps])
}
