import { describe, expect, it } from 'vitest'

import { findSummaryMetric, summaryToneForSeverity } from './summary.model'

describe('summary display model', () => {
  it('maps backend severities to existing UI tones', () => {
    expect(summaryToneForSeverity('success')).toBe('green')
    expect(summaryToneForSeverity('warning')).toBe('amber')
    expect(summaryToneForSeverity('danger')).toBe('red')
    expect(summaryToneForSeverity('neutral')).toBe('blue')
    expect(summaryToneForSeverity()).toBe('blue')
  })

  it('finds metrics by backend id without depending on array order', () => {
    expect(
      findSummaryMetric(
        [
          {
            id: 'first',
            label: 'First',
            value: 1,
            helper: 'First helper',
            severity: 'neutral',
          },
          {
            id: 'target',
            label: 'Target',
            value: 2,
            helper: 'Target helper',
            severity: 'success',
          },
        ],
        'target',
      ),
    ).toMatchObject({ label: 'Target', value: 2 })
  })
})
