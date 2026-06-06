import { describe, expect, it } from 'vitest'

import {
  buildReportCards,
  summarizeReports,
  type ReportsViewData,
} from './reports.model'

describe('reports model', () => {
  it('summarizes backend report DTOs and enables JSON exports', () => {
    const data = createReportsViewData()

    const summary = summarizeReports(data)
    const cards = buildReportCards(data)

    expect(summary).toMatchObject({
      procurementRecords: 8,
      financeRecords: 6,
      auditRecords: 4,
      integrationRecords: 3,
      jsonExportsAvailable: 4,
      restrictedReports: 0,
    })
    expect(cards.every((card) => card.exportStatus === 'available')).toBe(true)
    expect(cards.find((card) => card.id === 'procurement')).toMatchObject({
      status: 'api_backed',
      primaryMetric: '2 requisitions',
      secondaryMetric: '1 purchase orders / 1 invoices',
    })
  })

  it('marks finance as restricted when the backend summary withholds it', () => {
    const data = createReportsViewData()
    data.summary.sections = data.summary.sections.map((section) =>
      section.id === 'finance'
        ? { ...section, total: 0, status: 'restricted' }
        : section,
    )
    data.summary.totals.finance = 0
    delete data.reports.finance

    const summary = summarizeReports(data)
    const financeCard = buildReportCards(data).find(
      (card) => card.id === 'finance',
    )

    expect(summary.restrictedReports).toBe(1)
    expect(financeCard).toMatchObject({
      status: 'restricted',
      exportStatus: 'restricted',
    })
  })

  it('keeps finance reporting language clear of guaranteed return claims', () => {
    const financeCard = buildReportCards(createReportsViewData()).find(
      (card) => card.id === 'finance',
    )

    expect(financeCard?.description).toContain(
      'does not calculate guaranteed fixed returns',
    )
  })
})

function createReportsViewData(): ReportsViewData {
  return {
    summary: {
      organizationId: 'org-1',
      generatedAt: '2026-06-06T00:00:00.000Z',
      sections: [
        { id: 'procurement', label: 'Procurement', total: 8, status: 'ready' },
        { id: 'finance', label: 'Finance', total: 6, status: 'ready' },
        { id: 'audit', label: 'Audit', total: 4, status: 'ready' },
        {
          id: 'integrations',
          label: 'Integrations',
          total: 3,
          status: 'ready',
        },
      ],
      totals: {
        procurement: 8,
        finance: 6,
        audit: 4,
        integrations: 3,
      },
    },
    reports: {
      procurement: {
        organizationId: 'org-1',
        generatedAt: '2026-06-06T00:00:00.000Z',
        counts: {
          projects: 1,
          suppliers: 1,
          requisitions: 2,
          rfqs: 1,
          quotations: 1,
          purchaseOrders: 1,
          receipts: 0,
          invoices: 1,
          total: 8,
        },
        requisitionsByStatus: { APPROVED: 2 },
        purchaseOrdersByStatus: { ISSUED: 1 },
        invoicesByStatus: { RECEIVED: 1 },
      },
      finance: {
        organizationId: 'org-1',
        generatedAt: '2026-06-06T00:00:00.000Z',
        counts: {
          opportunities: 1,
          applications: 2,
          contracts: 1,
          disbursements: 0,
          ledgerEntries: 1,
          profitLossStatements: 1,
          closures: 0,
          lossExceptions: 0,
          total: 6,
        },
        opportunitiesByStatus: { ELIGIBLE: 1 },
        applicationsByStatus: { APPROVED: 2 },
        contractsByStatus: { EXECUTED: 1 },
        disbursementsByStatus: {},
      },
      audit: {
        organizationId: 'org-1',
        generatedAt: '2026-06-06T00:00:00.000Z',
        counts: {
          events: 2,
          hashRecords: 1,
          anchors: 1,
          failedAnchors: 0,
          pendingAnchors: 0,
          total: 4,
        },
        anchorsByStatus: { VERIFIED: 1 },
        hashRecordsByEntityType: { PurchaseOrder: 1 },
      },
      integrations: {
        organizationId: 'org-1',
        generatedAt: '2026-06-06T00:00:00.000Z',
        counts: {
          outboxEvents: 1,
          outboxPending: 0,
          outboxFailed: 0,
          reconciliationRecords: 1,
          webhookSubscriptions: 0,
          workerHeartbeats: 1,
          total: 3,
        },
        outboxByStatus: { COMPLETED: 1 },
        reconciliationByStatus: { COMPLETED: 1 },
      },
    },
  }
}
