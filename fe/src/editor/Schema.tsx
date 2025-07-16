import { z } from 'zod'

const zline = z.object({
  type: z.literal('line'),
  mdContent: z.string(),
  indent: z.number(),
  // If present, this has a task datum
  taskStatus: z.optional(z.enum(['complete', 'incomplete', 'unset'])),
})

type ZLine = z.infer<typeof zline>

const zdoc = z.object({
  type: z.literal('doc'),
  children: z.array(zline),
})

type ZDoc = z.infer<typeof zdoc>

export { zline, zdoc, type ZLine, type ZDoc }
