import { ForbiddenException } from '@nestjs/common';
import { FinanceService } from './finance.service';

describe('FinanceService summary', () => {
  it('builds finance metrics, queue, blockers, and readiness from backend records', async () => {
    const service = new FinanceService(
      createPrismaMock({
        openOpportunityCount: 2,
        reviewApplicationCount: 3,
        pendingChecklistCount: 2,
        dueDiligencePendingCount: 1,
        shariahPendingCount: 1,
        contractCount: 2,
        executedContractCount: 1,
        profitLossCount: 2,
        closureCount: 1,
        unresolvedLossExceptionCount: 1,
      }) as never,
      { create: jest.fn() } as never,
      { create: jest.fn() } as never,
    );

    const summary = await service.getSummary('org-demo', ['FINANCIER_USER']);

    expect(summary.metrics.map((metric) => metric.id)).toEqual(
      expect.arrayContaining([
        'finance-opportunities',
        'finance-applications',
        'finance-evidence-gaps',
        'finance-review-queues',
        'finance-contracts',
        'finance-closure',
        'finance-loss-exceptions',
      ]),
    );
    expect(summary.queue.map((item) => item.id)).toEqual(
      expect.arrayContaining([
        'finance-application-review-queue',
        'finance-evidence-gap-queue',
        'finance-due-diligence-queue',
        'finance-shariah-review-queue',
        'finance-contract-execution-queue',
        'finance-closure-ready-queue',
        'finance-loss-exception-queue',
      ]),
    );
    expect(summary.blockers.map((blocker) => blocker.id)).toEqual([
      'finance-evidence-gaps',
      'finance-unresolved-loss-exceptions',
    ]);
    expect(summary.readiness.map((item) => item.id)).toEqual(
      expect.arrayContaining([
        'finance-evidence-readiness',
        'finance-review-readiness',
        'finance-contract-readiness',
        'finance-closure-readiness',
        'finance-loss-exception-readiness',
      ]),
    );
    expect(summary.statusBreakdown).toEqual({
      SUBMITTED: 2,
      SHARIAH_IN_REVIEW: 1,
    });
  });

  it('rejects roles without finance visibility', async () => {
    const service = new FinanceService(
      createPrismaMock() as never,
      { create: jest.fn() } as never,
      { create: jest.fn() } as never,
    );

    await expect(
      service.getSummary('org-demo', ['PROCUREMENT_OFFICER']),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});

function createPrismaMock(overrides: Partial<FinanceSummaryCounts> = {}) {
  const counts: FinanceSummaryCounts = {
    opportunityCount: 2,
    openOpportunityCount: 0,
    applicationCount: 3,
    reviewApplicationCount: 0,
    statusGroups: [
      { status: 'SUBMITTED', _count: { _all: 2 } },
      { status: 'SHARIAH_IN_REVIEW', _count: { _all: 1 } },
    ],
    checklistCount: 2,
    pendingChecklistCount: 0,
    dueDiligencePendingCount: 0,
    shariahPendingCount: 0,
    contractCount: 1,
    executedContractCount: 1,
    disbursementCount: 1,
    profitLossCount: 1,
    closureCount: 1,
    unresolvedLossExceptionCount: 0,
    ...overrides,
  };

  return {
    procurementOpportunity: {
      count: jest
        .fn()
        .mockResolvedValueOnce(counts.opportunityCount)
        .mockResolvedValueOnce(counts.openOpportunityCount),
    },
    mudarabahApplication: {
      count: jest
        .fn()
        .mockResolvedValueOnce(counts.applicationCount)
        .mockResolvedValueOnce(counts.reviewApplicationCount)
        .mockResolvedValueOnce(counts.dueDiligencePendingCount)
        .mockResolvedValueOnce(counts.shariahPendingCount),
      groupBy: jest.fn().mockResolvedValue(counts.statusGroups),
    },
    evidenceChecklist: {
      count: jest
        .fn()
        .mockResolvedValueOnce(counts.checklistCount)
        .mockResolvedValueOnce(counts.pendingChecklistCount),
    },
    mudarabahContract: {
      count: jest
        .fn()
        .mockResolvedValueOnce(counts.contractCount)
        .mockResolvedValueOnce(counts.executedContractCount),
    },
    disbursement: {
      count: jest.fn().mockResolvedValue(counts.disbursementCount),
    },
    profitLossStatement: {
      count: jest.fn().mockResolvedValue(counts.profitLossCount),
    },
    closurePack: {
      count: jest.fn().mockResolvedValue(counts.closureCount),
    },
    lossException: {
      count: jest.fn().mockResolvedValue(counts.unresolvedLossExceptionCount),
    },
  };
}

type FinanceSummaryCounts = {
  opportunityCount: number;
  openOpportunityCount: number;
  applicationCount: number;
  reviewApplicationCount: number;
  statusGroups: Array<{ status: string; _count: { _all: number } }>;
  checklistCount: number;
  pendingChecklistCount: number;
  dueDiligencePendingCount: number;
  shariahPendingCount: number;
  contractCount: number;
  executedContractCount: number;
  disbursementCount: number;
  profitLossCount: number;
  closureCount: number;
  unresolvedLossExceptionCount: number;
};
