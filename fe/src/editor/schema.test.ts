import { describe, test, expect } from 'vitest'
import { analyzeDoc, type ZDoc, type ZDocAnnotated } from './schema'

describe('analyzeDoc', () => {
  test('should handle empty document', () => {
    const doc: ZDoc = {
      type: 'doc',
      children: [],
    }

    const result = analyzeDoc(doc)

    expect(result).toEqual({
      type: 'doc',
      children: [],
    })
  })

  test('should handle flat structure with no indentation', () => {
    const doc: ZDoc = {
      type: 'doc',
      children: [
        { type: 'line', mdContent: 'First line', indent: 0 },
        { type: 'line', mdContent: 'Second line', indent: 0 },
        { type: 'line', mdContent: 'Third line', indent: 0 },
      ],
    }

    const result = analyzeDoc(doc)

    expect(result.children).toHaveLength(3)
    expect(result.children[0]).toEqual({
      type: 'line',
      mdContent: 'First line',
      indent: 0,
      children: [],
      tags: [],
    })
    expect(result.children[1]).toEqual({
      type: 'line',
      mdContent: 'Second line',
      indent: 0,
      children: [],
      tags: [],
    })
    expect(result.children[2]).toEqual({
      type: 'line',
      mdContent: 'Third line',
      indent: 0,
      children: [],
      tags: [],
    })
  })

  test('should handle simple nested structure', () => {
    const doc: ZDoc = {
      type: 'doc',
      children: [
        { type: 'line', mdContent: 'Parent 1', indent: 0 },
        { type: 'line', mdContent: 'Child 1.1', indent: 1 },
        { type: 'line', mdContent: 'Child 1.2', indent: 1 },
        { type: 'line', mdContent: 'Parent 2', indent: 0 },
      ],
    }

    const result = analyzeDoc(doc)

    expect(result.children).toHaveLength(2)

    // First parent
    expect(result.children[0].mdContent).toBe('Parent 1')
    expect(result.children[0].children).toHaveLength(2)
    expect(result.children[0].children[0].mdContent).toBe('Child 1.1')
    expect(result.children[0].children[1].mdContent).toBe('Child 1.2')

    // Second parent
    expect(result.children[1].mdContent).toBe('Parent 2')
    expect(result.children[1].children).toHaveLength(0)
  })

  test('should handle deeply nested structure', () => {
    const doc: ZDoc = {
      type: 'doc',
      children: [
        { type: 'line', mdContent: 'Level 0', indent: 0 },
        { type: 'line', mdContent: 'Level 1', indent: 1 },
        { type: 'line', mdContent: 'Level 2', indent: 2 },
        { type: 'line', mdContent: 'Level 3', indent: 3 },
        { type: 'line', mdContent: 'Back to Level 1', indent: 1 },
      ],
    }

    const result = analyzeDoc(doc)

    expect(result.children).toHaveLength(1)

    const level0 = result.children[0]
    expect(level0.mdContent).toBe('Level 0')
    expect(level0.children).toHaveLength(2)

    const level1_1 = level0.children[0]
    expect(level1_1.mdContent).toBe('Level 1')
    expect(level1_1.children).toHaveLength(1)

    const level2 = level1_1.children[0]
    expect(level2.mdContent).toBe('Level 2')
    expect(level2.children).toHaveLength(1)

    const level3 = level2.children[0]
    expect(level3.mdContent).toBe('Level 3')
    expect(level3.children).toHaveLength(0)

    const level1_2 = level0.children[1]
    expect(level1_2.mdContent).toBe('Back to Level 1')
    expect(level1_2.children).toHaveLength(0)
  })

  test('should handle mixed indentation levels', () => {
    const doc: ZDoc = {
      type: 'doc',
      children: [
        { type: 'line', mdContent: 'Root 1', indent: 0 },
        { type: 'line', mdContent: 'Child 1.1', indent: 1 },
        { type: 'line', mdContent: 'Grandchild 1.1.1', indent: 2 },
        { type: 'line', mdContent: 'Root 2', indent: 0 },
        { type: 'line', mdContent: 'Child 2.1', indent: 1 },
        { type: 'line', mdContent: 'Child 2.2', indent: 1 },
        { type: 'line', mdContent: 'Grandchild 2.2.1', indent: 2 },
        { type: 'line', mdContent: 'Grandchild 2.2.2', indent: 2 },
      ],
    }

    const result = analyzeDoc(doc)

    expect(result.children).toHaveLength(2)

    // Root 1 structure
    const root1 = result.children[0]
    expect(root1.mdContent).toBe('Root 1')
    expect(root1.children).toHaveLength(1)
    expect(root1.children[0].mdContent).toBe('Child 1.1')
    expect(root1.children[0].children).toHaveLength(1)
    expect(root1.children[0].children[0].mdContent).toBe('Grandchild 1.1.1')

    // Root 2 structure
    const root2 = result.children[1]
    expect(root2.mdContent).toBe('Root 2')
    expect(root2.children).toHaveLength(2)
    expect(root2.children[0].mdContent).toBe('Child 2.1')
    expect(root2.children[0].children).toHaveLength(0)
    expect(root2.children[1].mdContent).toBe('Child 2.2')
    expect(root2.children[1].children).toHaveLength(2)
    expect(root2.children[1].children[0].mdContent).toBe('Grandchild 2.2.1')
    expect(root2.children[1].children[1].mdContent).toBe('Grandchild 2.2.2')
  })

  test('should handle single line document', () => {
    const doc: ZDoc = {
      type: 'doc',
      children: [{ type: 'line', mdContent: 'Only line', indent: 0 }],
    }

    const result = analyzeDoc(doc)

    expect(result.children).toHaveLength(1)
    expect(result.children[0]).toEqual({
      type: 'line',
      mdContent: 'Only line',
      indent: 0,
      children: [],
      tags: [],
    })
  })

  test('should preserve original line properties', () => {
    const doc: ZDoc = {
      type: 'doc',
      children: [
        {
          type: 'line',
          mdContent: 'Task line',
          indent: 0,
          taskStatus: 'incomplete',
        },
        {
          type: 'line',
          mdContent: 'Child task',
          indent: 1,
          taskStatus: 'complete',
        },
      ],
    }

    const result = analyzeDoc(doc)

    expect(result.children).toHaveLength(1)
    expect(result.children[0].taskStatus).toBe('incomplete')
    expect(result.children[0].children).toHaveLength(1)
    expect(result.children[0].children[0].taskStatus).toBe('complete')
  })

  test('should handle skipped indentation levels', () => {
    const doc: ZDoc = {
      type: 'doc',
      children: [
        { type: 'line', mdContent: 'Level 0', indent: 0 },
        { type: 'line', mdContent: 'Level 2 (skipped 1)', indent: 2 },
        { type: 'line', mdContent: 'Level 1', indent: 1 },
      ],
    }

    const result = analyzeDoc(doc)

    expect(result.children).toHaveLength(1)

    const level0 = result.children[0]
    expect(level0.mdContent).toBe('Level 0')
    expect(level0.children).toHaveLength(2)

    // The skipped level should still work
    expect(level0.children[0].mdContent).toBe('Level 2 (skipped 1)')
    expect(level0.children[1].mdContent).toBe('Level 1')
  })

  test('should initialize tags and children arrays for all lines', () => {
    const doc: ZDoc = {
      type: 'doc',
      children: [
        { type: 'line', mdContent: 'Line 1', indent: 0 },
        { type: 'line', mdContent: 'Line 2', indent: 1 },
      ],
    }

    const result = analyzeDoc(doc)

    // Check that all lines have empty tags and children arrays
    expect(result.children[0].tags).toEqual([])
    expect(result.children[0].children).toEqual(expect.any(Array))
    expect(result.children[0].children[0].tags).toEqual([])
    expect(result.children[0].children[0].children).toEqual([])
  })
})
