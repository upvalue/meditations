import { atom, useAtom, useSetAtom } from 'jotai'
import { useEffect } from 'react'

export const mainTitleAtom = atom<string | null>(null)
export const detailTitleAtom = atom<string | null>(null)

const formattedTitleAtom = atom((get) => {
  const main = get(mainTitleAtom)
  const detail = get(detailTitleAtom)
  
  const parts = []
  if (detail) parts.push(detail)
  if (main) parts.push(main)
  parts.push('tekne')
  
  return parts.join(' / ')
})

export const useTitle = () => {
  const [formattedTitle] = useAtom(formattedTitleAtom)
  
  useEffect(() => {
    document.title = formattedTitle
  }, [formattedTitle])
  
  return formattedTitle
}

export const useSetMainTitle = () => {
  return useSetAtom(mainTitleAtom)
}

export const useSetDetailTitle = () => {
  return useSetAtom(detailTitleAtom)
}

export const useClearDetailTitle = () => {
  const setDetailTitle = useSetAtom(detailTitleAtom)
  return () => setDetailTitle(null)
}