import { renderHook, act } from '@testing-library/react'
import { Provider, createStore } from 'jotai'
import { useTitle, useSetMainTitle, useSetDetailTitle, useClearDetailTitle } from './useTitle'
import React from 'react'

describe('useTitle', () => {
  let store: ReturnType<typeof createStore>
  
  beforeEach(() => {
    store = createStore()
    document.title = ''
  })

  const wrapper = ({ children }: { children: React.ReactNode }) => 
    React.createElement(Provider, { store }, children)


  it('should format title with only tekne when no main or detail title is set', () => {
    const { result } = renderHook(() => useTitle(), { wrapper })
    expect(result.current).toBe('tekne')
    expect(document.title).toBe('tekne')
  })

  it('should format title with main title and tekne', () => {
    const { result: titleResult } = renderHook(() => useTitle(), { wrapper })
    const { result: setMainResult } = renderHook(() => useSetMainTitle(), { wrapper })

    act(() => {
      setMainResult.current('My Document')
    })

    expect(titleResult.current).toBe('My Document / tekne')
    expect(document.title).toBe('My Document / tekne')
  })

  it('should format title with detail, main, and tekne', () => {
    const { result: titleResult } = renderHook(() => useTitle(), { wrapper })
    const { result: setMainResult } = renderHook(() => useSetMainTitle(), { wrapper })
    const { result: setDetailResult } = renderHook(() => useSetDetailTitle(), { wrapper })

    act(() => {
      setMainResult.current('My Document')
      setDetailResult.current('Editing')
    })

    expect(titleResult.current).toBe('Editing / My Document / tekne')
    expect(document.title).toBe('Editing / My Document / tekne')
  })

  it('should format title with detail and tekne when main is null', () => {
    const { result: titleResult } = renderHook(() => useTitle(), { wrapper })
    const { result: setDetailResult } = renderHook(() => useSetDetailTitle(), { wrapper })

    act(() => {
      setDetailResult.current('Loading')
    })

    expect(titleResult.current).toBe('Loading / tekne')
    expect(document.title).toBe('Loading / tekne')
  })

  it('should clear detail title', () => {
    const { result: titleResult } = renderHook(() => useTitle(), { wrapper })
    const { result: setMainResult } = renderHook(() => useSetMainTitle(), { wrapper })
    const { result: setDetailResult } = renderHook(() => useSetDetailTitle(), { wrapper })
    const { result: clearDetailResult } = renderHook(() => useClearDetailTitle(), { wrapper })

    act(() => {
      setMainResult.current('My Document')
      setDetailResult.current('Editing')
    })

    expect(titleResult.current).toBe('Editing / My Document / tekne')

    act(() => {
      clearDetailResult.current()
    })

    expect(titleResult.current).toBe('My Document / tekne')
  })
})