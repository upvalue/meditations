import { atom } from 'jotai'
import type { ZDoc } from './schema'

export const docAtom = atom<ZDoc>({
  type: 'doc',
  children: [
    {
      type: 'line',
      mdContent: 'The world is #test',
      indent: 0,
    },
    {
      type: 'line',
      mdContent: 'Task test',
      indent: 1,
      taskStatus: 'incomplete',
    },
    {
      type: 'line',
      mdContent: 'Number 2 #test',
      indent: 0,
    },
    {
      type: 'line',
      mdContent: 'Task test 2',
      taskStatus: 'incomplete',
      indent: 1,
    },
    {
      type: 'line',
      mdContent: '[[WikiLink]]',
      indent: 1,
    },
  ],
})

export const focusLineAtom = atom({
  lineIdx: -1,
  pos: 0,
})
