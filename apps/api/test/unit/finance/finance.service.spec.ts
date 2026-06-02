import { BadRequestException } from '@nestjs/common';
import { FinanceService } from '../../../src/modules/finance/finance.service';

describe('FR-28/FR-31/FR-38 Mudarabah finance unit rules', () => {
  function createService() {
    const tx = {
      evidenceChecklist: {
        create: jest.fn(),
      },
      mudarabahApplication: {
        update: jest.fn(),
      },
      mudarabahContract: {
        create: jest.fn(),
      },
      profitLossStatement: {
        create: jest.fn(),
      },
    };
    const prisma = {
      mudarabahApplication: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      evidenceChecklist: {
        create: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(tx)),
    };
    const auditEvents = {
      create: jest.fn(),
    };
    const outbox = {
      create: jest.fn(),
    };

    return {
      prisma,
      tx,
      auditEvents,
      outbox,
      service: new FinanceService(
        prisma as never,
        auditEvents as never,
        outbox as never,
      ),
    };
  }

  function application(overrides: Record<string, unknown> = {}) {
    return {
      id: 'app-1',
      organizationId: 'org-1',
      opportunityId: 'opp-1',
      status: 'APPROVED',
      purpose: 'Restricted procurement capital',
      requestedCapital: 10000,
      currency: 'MYR',
      capitalProviderRatio: 0.6,
      entrepreneurRatio: 0.4,
      opportunity: {
        evidencePackId: 'pack-1',
        evidencePack: {
          items: [],
        },
      },
      evidenceChecklist: {
        items: [
          {
            status: 'COMPLETED',
          },
        ],
      },
      dueDiligenceReports: [
        {
          status: 'APPROVED',
          decision: 'APPROVED',
        },
      ],
      shariahReviews: [
        {
          status: 'APPROVED',
          decision: 'APPROVED',
        },
      ],
      contracts: [],
      disbursements: [],
      ledgerEntries: [],
      profitLossStatements: [],
      closurePacks: [],
      ...overrides,
    };
  }

  it('generates checklist items from procurement evidence', async () => {
    const { service, prisma, auditEvents, outbox } = createService();
    prisma.mudarabahApplication.findUnique.mockResolvedValue(
      application({
        status: 'SUBMITTED',
        evidenceChecklist: null,
        opportunity: {
          evidencePackId: 'pack-1',
          evidencePack: {
            items: [
              {
                id: 'evidence-1',
                evidenceType: 'PURCHASE_ORDER',
              },
            ],
          },
        },
      }),
    );
    prisma.evidenceChecklist.create.mockImplementation(({ data }) => ({
      id: 'checklist-1',
      organizationId: data.organizationId,
      applicationId: data.applicationId,
      status: data.status,
      items: data.items.create.map((item: Record<string, unknown>) => ({
        ...item,
        id: `item-${item.requiredCode}`,
      })),
    }));
    prisma.mudarabahApplication.update.mockResolvedValue(
      application({
        status: 'EVIDENCE_PENDING',
        evidenceChecklist: {
          id: 'checklist-1',
          items: [],
        },
      }),
    );

    await expect(
      service.createEvidenceChecklist('app-1', {
        actorUserId: 'user-1',
      }),
    ).resolves.toEqual({
      id: 'checklist-1',
      items: [],
    });

    expect(prisma.evidenceChecklist.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'PENDING',
          items: expect.objectContaining({
            create: expect.arrayContaining([
              expect.objectContaining({
                requiredCode: 'PURCHASE_ORDER',
                evidenceItemId: 'evidence-1',
                status: 'COMPLETED',
              }),
              expect.objectContaining({
                requiredCode: 'INVOICE',
                status: 'PENDING',
              }),
            ]),
          }),
        }),
      }),
    );
    expect(auditEvents.create).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'EVIDENCE_CHECKLIST_GENERATED',
      }),
    );
    expect(outbox.create).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'EVIDENCE_CHECKLIST_GENERATED',
      }),
    );
  });

  it('does not start due diligence without a completed evidence checklist', async () => {
    const { service, prisma } = createService();
    prisma.mudarabahApplication.findUnique.mockResolvedValue(
      application({
        status: 'EVIDENCE_PENDING',
        evidenceChecklist: {
          items: [
            {
              status: 'PENDING',
            },
          ],
        },
      }),
    );

    await expect(service.createDueDiligence('app-1', {})).rejects.toThrow(
      'Due diligence requires a completed evidence checklist',
    );
  });

  it('does not generate a contract before financier approval', async () => {
    const { service, prisma } = createService();
    prisma.mudarabahApplication.findUnique.mockResolvedValue(
      application({
        dueDiligenceReports: [],
      }),
    );

    await expect(
      service.createContract({
        organizationId: 'org-1',
        applicationId: 'app-1',
      }),
    ).rejects.toThrow(
      'Contract cannot be generated without approved due diligence',
    );
  });

  it('does not generate a contract before Shariah approval', async () => {
    const { service, prisma } = createService();
    prisma.mudarabahApplication.findUnique.mockResolvedValue(
      application({
        shariahReviews: [],
      }),
    );

    await expect(
      service.createContract({
        organizationId: 'org-1',
        applicationId: 'app-1',
      }),
    ).rejects.toThrow(
      'Contract cannot be generated without approved Shariah review',
    );
  });

  it('calculates profit distribution using the agreed ratio', async () => {
    const { service, prisma, tx } = createService();
    prisma.mudarabahApplication.findUnique.mockResolvedValue(
      application({
        status: 'MONITORING',
      }),
    );
    tx.profitLossStatement.create.mockImplementation(({ data }) => ({
      id: 'pl-1',
      revenue: data.revenue,
      costs: data.costs,
      netProfit: data.netProfit,
      distributions: data.distributions.create,
      lossExceptions: [],
    }));

    const statement = await service.createProfitLossStatement({
      organizationId: 'org-1',
      applicationId: 'app-1',
      revenue: 10000,
      costs: 6000,
    });

    expect(statement).toEqual(
      expect.objectContaining({
        netProfit: 4000,
        distributions: [
          expect.objectContaining({
            party: 'CAPITAL_PROVIDER',
            amount: 2400,
          }),
          expect.objectContaining({
            party: 'ENTREPRENEUR',
            amount: 1600,
          }),
        ],
      }),
    );
  });

  it('records genuine loss as an exception instead of a guaranteed financier return', async () => {
    const { service, prisma, tx } = createService();
    prisma.mudarabahApplication.findUnique.mockResolvedValue(
      application({
        status: 'MONITORING',
      }),
    );
    tx.profitLossStatement.create.mockImplementation(({ data }) => ({
      id: 'pl-1',
      revenue: data.revenue,
      costs: data.costs,
      netProfit: data.netProfit,
      distributions: data.distributions?.create ?? [],
      lossExceptions: data.lossExceptions ? [data.lossExceptions.create] : [],
    }));

    const statement = await service.createProfitLossStatement({
      organizationId: 'org-1',
      applicationId: 'app-1',
      revenue: 3000,
      costs: 5000,
    });

    expect(statement).toEqual(
      expect.objectContaining({
        netProfit: -2000,
        distributions: [],
        lossExceptions: [
          expect.objectContaining({
            exceptionType: 'BUSINESS_LOSS',
            amount: 2000,
          }),
        ],
      }),
    );
  });

  it('rejects profit share ratios that are not positive', async () => {
    const { service, prisma } = createService();
    jest.spyOn(service, 'getOpportunity').mockResolvedValue({
      id: 'opp-1',
      organizationId: 'org-1',
      estimatedCapital: 10000,
      currency: 'MYR',
      title: 'PO finance',
    } as never);

    await expect(
      service.createApplication({
        organizationId: 'org-1',
        opportunityId: 'opp-1',
        requestedCapital: 5000,
        capitalProviderRatio: 0,
        entrepreneurRatio: 0,
      }),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.mudarabahApplication.update).not.toHaveBeenCalled();
  });
});
