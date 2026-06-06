import { ForbiddenException } from '@nestjs/common';
import { ProcurementOperationsService } from './procurement-operations.service';

describe('ProcurementOperationsService summary', () => {
  it('builds procurement metrics, queue, blockers, and readiness from backend records', async () => {
    const service = new ProcurementOperationsService(
      createPrismaMock({
        pendingApprovalCount: 2,
        submittedRequisitionCount: 3,
        openRfqCount: 1,
        purchaseOrderCount: 1,
        matchingRecords: [
          {
            purchaseOrder: { id: 'po-1' },
            receiptCount: 1,
            invoiceCount: 1,
            invoiceTotal: 900,
            amountMatches: false,
            matchingStatus: 'AMOUNT_MISMATCH',
          },
        ],
      }) as never,
      { create: jest.fn() } as never,
    );

    const summary = await service.getSummary('org-demo', [
      'PROCUREMENT_OFFICER',
    ]);

    expect(summary.metrics.map((metric) => metric.id)).toEqual(
      expect.arrayContaining([
        'procurement-projects',
        'suppliers',
        'requisitions',
        'sourcing',
        'purchase-orders',
        'matching-exceptions',
      ]),
    );
    expect(summary.queue.map((item) => item.id)).toEqual(
      expect.arrayContaining([
        'pending-approval-queue',
        'submitted-requisition-queue',
        'open-rfq-queue',
        'matching-exception-queue',
      ]),
    );
    expect(summary.blockers.map((blocker) => blocker.id)).toEqual([
      'procurement-matching-exceptions',
    ]);
    expect(summary.readiness.map((item) => item.id)).toEqual([
      'procurement-approval-readiness',
      'procurement-matching-readiness',
    ]);
    expect(summary.statusBreakdown).toEqual({
      APPROVED: 1,
      SUBMITTED: 2,
    });
  });

  it('rejects roles without procurement visibility', async () => {
    const service = new ProcurementOperationsService(
      createPrismaMock() as never,
      { create: jest.fn() } as never,
    );

    await expect(
      service.getSummary('org-demo', ['FINANCIER_USER']),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});

function createPrismaMock(overrides: Partial<ProcurementSummaryCounts> = {}) {
  const counts: ProcurementSummaryCounts = {
    projectCount: 1,
    supplierCount: 1,
    requisitionCount: 3,
    pendingApprovalCount: 0,
    submittedRequisitionCount: 0,
    rfqCount: 1,
    openRfqCount: 0,
    quotationCount: 1,
    purchaseOrderCount: 1,
    receiptCount: 1,
    invoiceCount: 1,
    statusGroups: [
      { status: 'APPROVED', _count: { _all: 1 } },
      { status: 'SUBMITTED', _count: { _all: 2 } },
    ],
    matchingRecords: [],
    ...overrides,
  };

  return {
    project: { count: jest.fn().mockResolvedValue(counts.projectCount) },
    supplier: { count: jest.fn().mockResolvedValue(counts.supplierCount) },
    requisition: {
      count: jest
        .fn()
        .mockResolvedValueOnce(counts.requisitionCount)
        .mockResolvedValueOnce(counts.submittedRequisitionCount),
      groupBy: jest.fn().mockResolvedValue(counts.statusGroups),
    },
    approvalRequest: {
      count: jest.fn().mockResolvedValue(counts.pendingApprovalCount),
    },
    rFQ: {
      count: jest
        .fn()
        .mockResolvedValueOnce(counts.rfqCount)
        .mockResolvedValueOnce(counts.openRfqCount),
    },
    quotation: { count: jest.fn().mockResolvedValue(counts.quotationCount) },
    purchaseOrder: {
      count: jest.fn().mockResolvedValue(counts.purchaseOrderCount),
      findMany: jest.fn().mockResolvedValue(
        counts.matchingRecords.map((record) => ({
          ...record.purchaseOrder,
          receipts: Array.from({ length: record.receiptCount }, (_, index) => ({
            id: `receipt-${index}`,
          })),
          invoices: Array.from({ length: record.invoiceCount }, (_, index) => ({
            id: `invoice-${index}`,
            amount: record.invoiceTotal / record.invoiceCount,
          })),
          totalAmount: record.amountMatches ? record.invoiceTotal : 1000,
        })),
      ),
    },
    receipt: { count: jest.fn().mockResolvedValue(counts.receiptCount) },
    invoice: { count: jest.fn().mockResolvedValue(counts.invoiceCount) },
  };
}

type ProcurementSummaryCounts = {
  projectCount: number;
  supplierCount: number;
  requisitionCount: number;
  pendingApprovalCount: number;
  submittedRequisitionCount: number;
  rfqCount: number;
  openRfqCount: number;
  quotationCount: number;
  purchaseOrderCount: number;
  receiptCount: number;
  invoiceCount: number;
  statusGroups: Array<{ status: string; _count: { _all: number } }>;
  matchingRecords: Array<{
    purchaseOrder: { id: string };
    receiptCount: number;
    invoiceCount: number;
    invoiceTotal: number;
    amountMatches: boolean;
    matchingStatus: string;
  }>;
};
