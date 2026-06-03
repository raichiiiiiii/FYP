import { describe, expect, it } from 'vitest'

import {
  buildReportCards,
  createEmptyReportsData,
  summarizeReports,
} from './reports.model'

describe('reports model', () => {
  it('summarizes API-backed report source data without inventing exports', () => {
    const data = createEmptyReportsData()
    data.requisitions = [{ id: 'req-1' }]
    data.purchaseOrders = [{ id: 'po-1' }]
    data.matchingRecords = [{ id: 'match-1' }]
    data.applications = [{ id: 'app-1' }]
    data.auditEvents = [{ id: 'audit-1' }, { id: 'audit-2' }]
    data.outboxEvents = [{ id: 'outbox-1' }]

    const summary = summarizeReports(data)
    const cards = buildReportCards(data)

    expect(summary).toMatchObject({
      procurementRecords: 3,
      financeRecords: 1,
      auditEvents: 2,
      integrationRecords: 1,
      blockedExports: cards.length,
    })
    expect(
      cards.every((card) => card.exportStatus === 'not_available'),
    ).toBe(true)
  })

  it('marks reports as blocked when no source records are available', () => {
    const cards = buildReportCards(createEmptyReportsData())

    expect(cards.map((card) => card.status)).toEqual([
      'blocked',
      'blocked',
      'blocked',
      'blocked',
      'blocked',
      'blocked',
    ])
  })

  it('keeps ledger reporting language clear of guaranteed return claims', () => {
    const ledgerCard = buildReportCards(createEmptyReportsData()).find(
      (card) => card.id === 'finance-ledger-pl',
    )

    expect(ledgerCard?.description).toContain(
      'does not calculate guaranteed fixed returns',
    )
  })
})
