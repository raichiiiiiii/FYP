import { describe, expect, it } from 'vitest'

import {
  isMatchException,
  summarizeProcurementHub,
  toHubNumber,
} from './procurementHub.model'

describe('procurement hub summary model', () => {
  it('aggregates existing procurement records into hub KPIs', () => {
    const summary = summarizeProcurementHub({
      requisitions: [
        { id: 'req-1', status: 'SUBMITTED', totalAmount: 12000 },
        { id: 'req-2', status: 'APPROVED', totalAmount: '5000' },
      ],
      suppliers: [
        { id: 'sup-1', name: 'Mega Components', status: 'active' },
        { id: 'sup-2', name: 'Pending Supplier', status: 'pending' },
      ],
      purchaseOrders: [
        { id: 'po-1', poNumber: 'PO-1', status: 'ISSUED', totalAmount: 8000 },
        { id: 'po-2', poNumber: 'PO-2', status: 'CLOSED', totalAmount: 2000 },
      ],
      matchingRecords: [
        {
          purchaseOrder: { id: 'po-1', poNumber: 'PO-1' },
          receiptCount: 1,
          invoiceCount: 1,
          invoiceTotal: 8000,
          amountMatches: true,
          matchingStatus: 'MATCHED',
        },
        {
          purchaseOrder: { id: 'po-2', poNumber: 'PO-2' },
          receiptCount: 1,
          invoiceCount: 1,
          invoiceTotal: 2500,
          amountMatches: false,
          matchingStatus: 'MATCH_EXCEPTION',
        },
      ],
      approvalTasks: [{ id: 'approval-1', status: 'PENDING' }],
      rfqs: [{ id: 'rfq-1', status: 'PUBLISHED' }],
      quotations: [{ id: 'quote-1', status: 'RECEIVED', totalAmount: 8000 }],
    })

    expect(summary).toMatchObject({
      totalRequisitions: 2,
      pendingApproval: 2,
      approvedRequisitions: 1,
      openPurchaseOrders: 1,
      matchedRecords: 1,
      matchExceptions: 1,
      activeSuppliers: 1,
      totalCommittedValue: 10000,
      activeRfqs: 1,
      quotationsReceived: 1,
    })
  })

  it('treats mismatched amounts as exceptions even when status text is generic', () => {
    expect(
      isMatchException({
        purchaseOrder: { id: 'po-1', poNumber: 'PO-1' },
        receiptCount: 1,
        invoiceCount: 1,
        invoiceTotal: 3000,
        amountMatches: false,
        matchingStatus: 'PENDING',
      }),
    ).toBe(true)
  })

  it('normalizes invalid numeric input to zero for display summaries', () => {
    expect(toHubNumber('not-a-number')).toBe(0)
    expect(toHubNumber('1200.50')).toBe(1200.5)
  })
})
