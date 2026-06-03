import { describe, expect, it } from 'vitest'

import {
  calculateProfitLossSummary,
  formatProfitShareRatio,
  getLossTreatmentExplanation,
  groupLedgerEntriesByReviewRole,
  hasGuaranteedFixedReturnPattern,
  mapLedgerEntry,
  mapProfitLossStatement,
} from './ledger.model'

describe('mudarabah ledger and profit/loss model', () => {
  it('distributes positive profit by approved ratio only', () => {
    const entries = [
      mapLedgerEntry({
        id: 'le-revenue',
        applicationId: 'app-001',
        entryType: 'REVENUE',
        amount: 100000,
        currency: 'MYR',
        occurredAt: '2026-06-01T00:00:00.000Z',
        sourceDocumentId: 'buyer-receipt-001',
        description: 'Buyer milestone receipt',
      }),
      mapLedgerEntry({
        id: 'le-cost',
        applicationId: 'app-001',
        entryType: 'COST',
        amount: 70000,
        currency: 'MYR',
        occurredAt: '2026-06-02T00:00:00.000Z',
        sourceDocumentId: 'po-001',
        description: 'Supplier payment',
      }),
    ]

    const summary = calculateProfitLossSummary({
      applicationId: 'app-001',
      entries,
      profitShareRatio: {
        rabbUlMal: 0.6,
        mudarib: 0.4,
      },
    })

    expect(summary.netProfitOrLoss).toBe(30000)
    expect(summary.distribution).toEqual({
      rabbUlMalAmount: 18000,
      mudaribAmount: 12000,
    })
    expect(summary.evidenceLineage.map((link) => link.role)).toEqual([
      'revenue',
      'allowed_cost',
    ])
    expect(formatProfitShareRatio(0.6)).toBe('60%')
    expect(formatProfitShareRatio(40)).toBe('40%')
  })

  it('shows genuine loss without calculating a profit distribution', () => {
    const entries = [
      mapLedgerEntry({
        id: 'le-revenue',
        applicationId: 'app-loss',
        entryType: 'BUYER_RECEIPT',
        amount: 50000,
        description: 'Buyer receipt',
      }),
      mapLedgerEntry({
        id: 'le-cost',
        applicationId: 'app-loss',
        entryType: 'ALLOWED_EXPENSE',
        amount: 72000,
        description: 'Approved project expense',
      }),
    ]

    const summary = calculateProfitLossSummary({
      applicationId: 'app-loss',
      entries,
      profitShareRatio: {
        rabbUlMal: 60,
        mudarib: 40,
      },
    })

    expect(summary.netProfitOrLoss).toBe(-22000)
    expect(summary.distribution).toBeUndefined()
    expect(summary.status).toBe('review_required')
    expect(getLossTreatmentExplanation(summary)).toContain(
      'No profit distribution is calculated',
    )
  })

  it('maps backend loss exception statements into loss exception status', () => {
    const summary = mapProfitLossStatement({
      id: 'pls-001',
      applicationId: 'app-loss-exception',
      revenue: 40000,
      costs: 55000,
      netProfit: -15000,
      lossExceptions: [
        {
          id: 'loss-001',
          exceptionType: 'BUSINESS_LOSS',
          amount: 15000,
          notes: 'Review genuine loss evidence.',
        },
      ],
      application: {
        capitalProviderRatio: 0.7,
        entrepreneurRatio: 0.3,
        currency: 'MYR',
      },
    })

    expect(summary.status).toBe('loss_exception')
    expect(getLossTreatmentExplanation(summary)).toContain(
      'classify genuine commercial loss separately',
    )
    expect(summary.lossExceptions).toEqual([
      {
        id: 'loss-001',
        exceptionType: 'BUSINESS_LOSS',
        amount: 15000,
        notes: 'Review genuine loss evidence.',
      },
    ])
    expect(summary.distribution).toBeUndefined()
  })

  it('does not create guaranteed fixed return behavior', () => {
    const summary = calculateProfitLossSummary({
      applicationId: 'app-no-fixed-return',
      entries: [
        mapLedgerEntry({
          id: 'capital',
          applicationId: 'app-no-fixed-return',
          entryType: 'CAPITAL',
          amount: 100000,
          description: 'Capital disbursed',
        }),
        mapLedgerEntry({
          id: 'loss',
          applicationId: 'app-no-fixed-return',
          entryType: 'LOSS_RECOGNITION',
          amount: 10000,
          description: 'Recognized business loss',
        }),
      ],
      profitShareRatio: {
        rabbUlMal: 0.8,
        mudarib: 0.2,
      },
    })

    expect(summary.distribution).toBeUndefined()
    expect(hasGuaranteedFixedReturnPattern({ summary })).toBe(false)
    expect(
      hasGuaranteedFixedReturnPattern({
        summary,
        fixedReturnRate: 0.1,
      }),
    ).toBe(true)
  })

  it('groups ledger entries by reviewer evidence role', () => {
    const groups = groupLedgerEntriesByReviewRole([
      mapLedgerEntry({
        id: 'capital',
        applicationId: 'app-grouped',
        entryType: 'CAPITAL',
        amount: 10000,
        description: 'Capital disbursed',
      }),
      mapLedgerEntry({
        id: 'revenue',
        applicationId: 'app-grouped',
        entryType: 'REVENUE',
        amount: 15000,
        description: 'Buyer receipt',
      }),
      mapLedgerEntry({
        id: 'cost',
        applicationId: 'app-grouped',
        entryType: 'COST',
        amount: 8000,
        description: 'Supplier payment',
      }),
      mapLedgerEntry({
        id: 'loss',
        applicationId: 'app-grouped',
        entryType: 'LOSS_RECOGNITION',
        amount: 1000,
        description: 'Loss recognition',
      }),
    ])

    expect(groups.map((group) => [group.id, group.entries.length])).toEqual([
      ['revenue', 1],
      ['allowed_cost', 1],
      ['capital', 1],
      ['other', 1],
    ])
  })
})
