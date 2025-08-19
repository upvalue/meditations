import { atom } from 'jotai'
import { lineMake, type ZDoc } from './schema'

export const docAtom = atom<ZDoc>({
  type: 'doc',
  children: [
    lineMake(0, 'The world is #test'),
    lineMake(0, 'Number 2 #test'),
    lineMake(1, '[[WikiLink]]'),
  ],
})

export const focusLineAtom = atom({
  lineIdx: -1,
  pos: 0,
})
