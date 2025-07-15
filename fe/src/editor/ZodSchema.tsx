import { z } from 'zod'

// TODO: It's not really ideal to maintain a separate Zod Schema for this;
// it would be nicer to somehow extract the types from Prosemirror/Tiptap
// However, we also have opinions that may be even stricter than are documented
// in Prosemirror's schema specification

export const ztext = z.object({
  type: z.literal('text'),
  text: z.string(),
})

export const zparagraph = z.object({
  type: z.literal('paragraph'),
  content: z.array(ztext),
})

export const zlineBody = z.object({
  type: z.literal('lineBody'),
  content: z.array(zparagraph),
})

export const zline = z.object({
  type: z.literal('line'),
  content: z.array(zlineBody),
})

export const zdoc = z.object({
  type: z.literal('doc'),
  content: z.array(zline),
})
