import { describe, expect, it } from 'vitest'

import { routeMetadata } from '../../app/navigation'
import { demoGuideSteps, getDemoGuideStepById } from './demoGuide.manifest'

describe('demoGuideSteps', () => {
  it('defines a unique reviewer path with required copy and notes', () => {
    const ids = demoGuideSteps.map((step) => step.id)

    expect(new Set(ids).size).toBe(ids.length)
    expect(demoGuideSteps.length).toBeGreaterThanOrEqual(10)

    for (const step of demoGuideSteps) {
      expect(step.id).toMatch(/^[a-z0-9-]+$/)
      expect(step.title).toBeTruthy()
      expect(step.shortDescription).toBeTruthy()
      expect(step.route).toMatch(/^\//)
      expect(step.reviewerNotes).toBeTruthy()
      expect(step.evidenceLinks.length).toBeGreaterThan(0)
    }
  })

  it('links only to known production routes', () => {
    const knownRoutes = new Set(routeMetadata.map((route) => route.path))

    for (const step of demoGuideSteps) {
      expect(knownRoutes.has(step.route)).toBe(true)
    }
  })

  it('marks real Fabric proof as evidence-backed and environment-gated', () => {
    const fabricStep = getDemoGuideStepById('fabric-proof-panel')

    expect(fabricStep).toBeDefined()
    expect(fabricStep?.riskLevel).toBe('environment-gated')
    expect(fabricStep?.completionMode).toBe('environment-gated')
    expect(fabricStep?.optional).toBe(true)
    expect(fabricStep?.reviewerNotes.toLowerCase()).toContain('mock')
    expect(fabricStep?.evidenceLinks).toContain(
      'docs/evidence/qa/FABRIC_GATEWAY_UAT_EVIDENCE.md',
    )
  })

  it('does not import fixture or generated secret paths into the guide', () => {
    const serialized = JSON.stringify(demoGuideSteps).toLowerCase()

    expect(serialized).not.toContain('fixtures')
    expect(serialized).not.toContain('.env')
    expect(serialized).not.toContain('key.pem')
    expect(serialized).not.toContain('cert.pem')
    expect(serialized).not.toContain('private')
    expect(serialized).not.toContain('fabric_private_key_pem')
  })
})
