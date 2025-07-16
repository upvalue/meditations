import { z } from 'zod'

// TODO: It's not really ideal to maintain a separate Zod Schema for this;
// it would be nicer to somehow extract the types from Prosemirror/Tiptap
// However, we also have opinions that may be even stricter than are documented
// in Prosemirror's schema specification.

// Define the types first
type Text = {
  type: 'text'
  text: string
}

type Tag = {
  type: 'tag'
  attrs: {
    name: string
  }
}

type Paragraph = {
  type: 'paragraph'
  content?: (Text | Tag)[]
}

type LineBody = {
  type: 'lineBody'
  content: (Paragraph | Line)[]
}

type Line = {
  type: 'line'
  content: LineBody[]
}

type Doc = {
  type: 'doc'
  content: Line[]
}

// Now define the schemas with proper types
export const ztext: z.ZodType<Text> = z.object({
  type: z.literal('text'),
  text: z.string(),
})

export const ztag: z.ZodType<Tag> = z.object({
  type: z.literal('tag'),
  attrs: z.object({
    name: z.string(),
  }),
})

export const zparagraph: z.ZodType<Paragraph> = z.object({
  type: z.literal('paragraph'),
  content: z.optional(z.array(z.union([ztext, ztag]))),
})

export const zlineBody: z.ZodType<LineBody> = z.object({
  type: z.literal('lineBody'),
  content: z.array(z.union([zparagraph, z.lazy(() => zline)])),
})

export const zline: z.ZodType<Line> = z.object({
  type: z.literal('line'),
  content: z.array(zlineBody),
})

export const zdoc: z.ZodType<Doc> = z.object({
  type: z.literal('doc'),
  content: z.array(zline),
})

export const znode = z.union([zdoc, zline, zlineBody, zparagraph, ztext, ztag])
