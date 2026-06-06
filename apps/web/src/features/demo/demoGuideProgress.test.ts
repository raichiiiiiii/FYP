import { describe, expect, it } from 'vitest'

import {
  DEMO_GUIDE_PROGRESS_STORAGE_KEY,
  emptyDemoGuideProgress,
  markDemoGuideVisitedStep,
  readDemoGuideProgress,
  resetDemoGuideProgress,
  setDemoGuideCollapsed,
  toggleDemoGuideReviewedStep,
  writeDemoGuideProgress,
} from './demoGuideProgress'

class MemoryStorage implements Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> {
  private readonly values = new Map<string, string>()

  getItem(key: string) {
    return this.values.get(key) ?? null
  }

  setItem(key: string, value: string) {
    this.values.set(key, value)
  }

  removeItem(key: string) {
    this.values.delete(key)
  }
}

describe('demo guide progress', () => {
  it('stores only local reviewer progress state', () => {
    const storage = new MemoryStorage()
    const progress = toggleDemoGuideReviewedStep(
      markDemoGuideVisitedStep(
        setDemoGuideCollapsed(emptyDemoGuideProgress, false),
        'dashboard-overview',
      ),
      'dashboard-overview',
    )

    writeDemoGuideProgress(progress, storage)

    expect(readDemoGuideProgress(storage)).toEqual({
      collapsed: false,
      reviewedStepIds: ['dashboard-overview'],
      visitedStepIds: ['dashboard-overview'],
    })
    expect(storage.getItem(DEMO_GUIDE_PROGRESS_STORAGE_KEY)).not.toContain(
      'organizationId',
    )
  })

  it('toggles reviewed steps and deduplicates visited steps', () => {
    const reviewed = toggleDemoGuideReviewedStep(
      emptyDemoGuideProgress,
      'reports-json-export',
    )
    const unreviewed = toggleDemoGuideReviewedStep(
      reviewed,
      'reports-json-export',
    )
    const visited = markDemoGuideVisitedStep(
      markDemoGuideVisitedStep(emptyDemoGuideProgress, 'dashboard-overview'),
      'dashboard-overview',
    )

    expect(reviewed.reviewedStepIds).toEqual(['reports-json-export'])
    expect(unreviewed.reviewedStepIds).toEqual([])
    expect(visited.visitedStepIds).toEqual(['dashboard-overview'])
  })

  it('falls back to empty progress for invalid stored values and can reset', () => {
    const storage = new MemoryStorage()

    storage.setItem(DEMO_GUIDE_PROGRESS_STORAGE_KEY, '{not-json')
    expect(readDemoGuideProgress(storage)).toEqual(emptyDemoGuideProgress)

    writeDemoGuideProgress(
      {
        collapsed: false,
        reviewedStepIds: ['graph-anchor-risk-overlay'],
        visitedStepIds: [],
      },
      storage,
    )
    resetDemoGuideProgress(storage)

    expect(readDemoGuideProgress(storage)).toEqual(emptyDemoGuideProgress)
  })
})
