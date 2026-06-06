import { describe, expect, it } from 'vitest'

import { getDemoGuideStepById } from './demoGuide.manifest'
import { emptyDemoGuideProgress } from './demoGuideProgress'
import {
  canAutoReviewDemoGuideStep,
  getDemoGuideStepStatus,
} from './demoGuideStatus'

describe('demo guide status', () => {
  it('does not auto-review environment-gated Fabric proof', () => {
    const fabricStep = getDemoGuideStepById('fabric-proof-panel')

    expect(fabricStep).toBeDefined()
    expect(canAutoReviewDemoGuideStep(fabricStep!)).toBe(false)
    expect(
      getDemoGuideStepStatus(fabricStep!, {
        ...emptyDemoGuideProgress,
        visitedStepIds: ['fabric-proof-panel'],
      }),
    ).toBe('Environment-gated')
  })

  it('allows manual reviewed status to override visited and gated labels', () => {
    const fabricStep = getDemoGuideStepById('fabric-proof-panel')

    expect(
      getDemoGuideStepStatus(fabricStep!, {
        collapsed: false,
        reviewedStepIds: ['fabric-proof-panel'],
        visitedStepIds: ['fabric-proof-panel'],
      }),
    ).toBe('Reviewed')
  })

  it('distinguishes available, visited, and evidence-backed steps', () => {
    const dashboardStep = getDemoGuideStepById('dashboard-overview')
    const reportsStep = getDemoGuideStepById('reports-json-export')

    expect(getDemoGuideStepStatus(dashboardStep!, emptyDemoGuideProgress)).toBe(
      'Available',
    )
    expect(
      getDemoGuideStepStatus(dashboardStep!, {
        ...emptyDemoGuideProgress,
        visitedStepIds: ['dashboard-overview'],
      }),
    ).toBe('Visited')
    expect(getDemoGuideStepStatus(reportsStep!, emptyDemoGuideProgress)).toBe(
      'Evidence-backed',
    )
  })
})
