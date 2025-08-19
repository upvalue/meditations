// schema.ts - schema definition and raw operations on the schema
import { z } from 'zod'

const zline = z.object({
  type: z.literal('line'),
  mdContent: z.string(),
  indent: z.number(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  // If present, this has a task datum
  taskStatus: z.optional(z.enum(['complete', 'incomplete', 'unset'])),
})

type ZLine = z.infer<typeof zline>

const zdoc = z.object({
  type: z.literal('doc'),
  children: z.array(zline),
})

type ZDoc = z.infer<typeof zdoc>

export type ZTreeLine = ZLine & {
  children: ZTreeLine[]
  tags: string[]
  arrayIdx: number
}

/**
 * For analysis purpose -- lines are converted into a tree struct
 * and information from mdContent is pulled out
 */
const ztreeLine: z.ZodType<ZTreeLine> = zline.extend({
  children: z.array(z.lazy(() => ztreeLine)),
  tags: z.array(z.string()),
  // Index of the line in the original document
  arrayIdx: z.number(),
})

const zdocTree = zdoc.extend({
  children: z.array(ztreeLine),
})

type ZDocTree = z.infer<typeof zdocTree>

export const tagPattern = /#[a-zA-Z0-9_-]+/g

const analyzeDoc = (doc: ZDoc): ZDocTree => {
  const root: ZDocTree = {
    ...doc,
    children: [],
  }

  const stack: ZTreeLine[] = []
  for (let i = 0; i != doc.children.length; i++) {
    const node: ZTreeLine = {
      ...doc.children[i],
      children: [],
      tags: [],
      arrayIdx: i,
    }

    // Handle multiple matches
    const matches = node.mdContent.match(tagPattern)
    if (matches) {
      node.tags.push(...matches)
    }

    while (stack.length > node.indent) {
      stack.pop()
    }

    if (stack.length === 0) {
      root.children.push(node)
    } else {
      stack[stack.length - 1].children.push(node)
    }

    stack.push(node)
  }

  return root
}

export {
  zline,
  zdoc,
  analyzeDoc,
  type ZLine,
  type ZDoc,
  type ZTreeLine as ZLineTree,
  type ZDocTree,
}
