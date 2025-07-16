import { z } from 'zod'

// Define the base interface
interface ZLine {
  type: 'line'
  mdContent: string
  indent: number
}

// Define the Zod schema - no recursion needed
const zline = z.object({
  type: z.literal('line'),
  mdContent: z.string(),
  indent: z.number(),
})

const zdoc = z.object({
  type: z.literal('doc'),
  children: z.array(zline),
})

type ZDoc = z.infer<typeof zdoc>

export { zline, zdoc, type ZLine, type ZDoc }
