import { atom } from 'jotai'

/**
 * Second panel can show either devtools or the time / live search view
 */
const secondPanelMode = atom<'devtools' | 'normal'>('devtools')
