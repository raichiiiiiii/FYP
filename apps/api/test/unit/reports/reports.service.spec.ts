import { ForbiddenException } from '@nestjs/common';
import { ReportsService } from '../../../src/modules/reports/reports.service';

describe('ReportsService', () => {
  function createPrisma(roleCodes: string[]) {
    const count = (value = 0) => jest.fn().mockResolvedValue(value);
    const findMany = jest.fn().mockResolvedValue([]);

    return {
      membership: {
        findMany: jest.fn().mockResolvedValue(
          roleCodes.map((code) => ({
            role: {
              code,
            },
          })),
        ),
      },
      project: { count: count(1) },
      supplier: { count: count(1) },
      requisition: { count: count(1), findMany },
      rFQ: { count: count(0) },
      quotation: { count: count(0) },
      purchaseOrder: { count: count(1), findMany },
      receipt: { count: count(0) },
      invoice: { count: count(1), findMany },
      procurementOpportunity: { count: count(0), findMany },
      mudarabahApplication: { count: count(0), findMany },
      mudarabahContract: { count: count(0), findMany },
      disbursement: { count: count(0), findMany },
      projectLedgerEntry: { count: count(0) },
      profitLossStatement: { count: count(0) },
      closurePack: { count: count(0) },
      lossException: { count: count(0) },
      auditEvent: { count: count(0) },
      hashRecord: { count: count(0), findMany },
      auditAnchor: { count: count(0), findMany },
      outboxEvent: { count: count(0), findMany },
      integrationReconciliationRecord: { count: count(0), findMany },
      webhookSubscription: { count: count(0) },
      workerHeartbeat: { count: count(0) },
    };
  }

  it('marks finance as restricted without querying finance aggregates for procurement-only users', async () => {
    const prisma = createPrisma(['PROCUREMENT_OFFICER']);
    const service = new ReportsService(
      prisma as never,
      {} as never,
      {} as never,
    );

    const summary = await service.getSummary({
      organizationId: 'org-1',
      actorUserId: 'user-1',
    });

    expect(summary.sections).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'finance',
          status: 'restricted',
          total: 0,
        }),
      ]),
    );
    expect(summary.totals.finance).toBe(0);
    expect(prisma.procurementOpportunity.count).not.toHaveBeenCalled();
  });

  it('rejects direct finance reports for procurement-only users', async () => {
    const prisma = createPrisma(['PROCUREMENT_OFFICER']);
    const service = new ReportsService(
      prisma as never,
      {} as never,
      {} as never,
    );

    await expect(
      service.getFinanceReport({
        organizationId: 'org-1',
        actorUserId: 'user-1',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
