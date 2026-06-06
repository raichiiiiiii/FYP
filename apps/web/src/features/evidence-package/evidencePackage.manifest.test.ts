import { describe, expect, it } from 'vitest'

import {
  evidenceCategoryLabel,
  evidencePackageCategories,
  evidencePackageItems,
} from './evidencePackage.manifest'

describe('evidencePackageItems', () => {
  it('defines unique safe evidence item IDs with required metadata', () => {
    const ids = evidencePackageItems.map((item) => item.id)

    expect(new Set(ids).size).toBe(ids.length)
    expect(evidencePackageItems.length).toBeGreaterThanOrEqual(20)

    for (const item of evidencePackageItems) {
      expect(item.id).toMatch(/^[a-z0-9-]+$/)
      expect(item.title).toBeTruthy()
      expect(item.description).toBeTruthy()
      expect(item.path).toMatch(/^docs\//)
      expect(item.riskNote).toBeTruthy()
      expect(evidencePackageCategories).toContain(item.category)
      expect(['complete', 'partial', 'production-hardening', 'resolved-blocker']).toContain(
        item.status,
      )
    }
  })

  it('excludes secret-bearing file paths from the reviewer package', () => {
    const serializedPaths = evidencePackageItems
      .map((item) => item.path.toLowerCase())
      .join('\n')

    expect(serializedPaths).not.toContain('.env')
    expect(serializedPaths).not.toContain('key.pem')
    expect(serializedPaths).not.toContain('cert.pem')
    expect(serializedPaths).not.toContain('ca.crt')
    expect(serializedPaths).not.toContain('private')
    expect(serializedPaths).not.toContain('secret')
  })

  it('labels categories for reviewer display', () => {
    expect(evidenceCategoryLabel('roadmap-validation')).toBe(
      'Roadmap Validation',
    )
    expect(evidenceCategoryLabel('fabric-hash')).toBe('Fabric Hash')
  })
})
