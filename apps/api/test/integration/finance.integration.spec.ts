import request from 'supertest';
import { createProcurementFixture } from './helpers/api-workflow-fixtures';
import {
  closeIntegrationApp,
  createIntegrationApp,
  type IntegrationAppContext,
} from './helpers/integration-test-context';

describe('Integration: finance', () => {
  let context: IntegrationAppContext;

  beforeAll(async () => {
    context = await createIntegrationApp();
  });

  afterAll(async () => {
    await closeIntegrationApp(context);
  });

  it('creates an opportunity/application from procurement data and writes outbox events', async () => {
    const fixture = await createProcurementFixture(context.app);
    const evidencePack = (
      await request(context.app.getHttpServer())
        .post('/api/v1/evidence-packs')
        .send({
          organizationId: fixture.organizationId,
          actorUserId: fixture.actorUserId,
          projectId: fixture.project.id,
        })
        .expect(201)
    ).body as { id: string };

    const opportunity = (
      await request(context.app.getHttpServer())
        .post('/api/v1/opportunities')
        .send({
          organizationId: fixture.organizationId,
          actorUserId: fixture.actorUserId,
          projectId: fixture.project.id,
          requisitionId: fixture.requisition.id,
          purchaseOrderId: fixture.purchaseOrder.id,
          evidencePackId: evidencePack.id,
          estimatedCapital: 6000,
          expectedProfit: 1200,
        })
        .expect(201)
    ).body as { id: string };

    const application = (
      await request(context.app.getHttpServer())
        .post('/api/v1/applications')
        .send({
          organizationId: fixture.organizationId,
          actorUserId: fixture.actorUserId,
          opportunityId: opportunity.id,
          requestedCapital: 6000,
          capitalProviderRatio: 0.6,
          entrepreneurRatio: 0.4,
        })
        .expect(201)
    ).body as { id: string };

    await request(context.app.getHttpServer())
      .post(`/api/v1/applications/${application.id}/submit`)
      .send({ actorUserId: fixture.actorUserId })
      .expect(201);

    const checklist = (
      await request(context.app.getHttpServer())
        .post(`/api/v1/applications/${application.id}/evidence-checklist`)
        .send({ actorUserId: fixture.actorUserId })
        .expect(201)
    ).body as { status: string; items: Array<{ status: string }> };

    const outboxEvents = await context.prisma.outboxEvent.findMany({
      where: {
        organizationId: fixture.organizationId,
        eventType: {
          in: [
            'PROCUREMENT_OPPORTUNITY_CREATED',
            'MUDARABAH_APPLICATION_CREATED',
            'MUDARABAH_APPLICATION_SUBMITTED',
            'EVIDENCE_CHECKLIST_GENERATED',
          ],
        },
      },
    });

    expect(checklist.items.every((item) => item.status === 'COMPLETED')).toBe(
      true,
    );
    expect(outboxEvents).toHaveLength(4);
  });

  it('gates reviewer actions and queues mock e-signature from generated contract documents', async () => {
    const fixture = await createProcurementFixture(context.app);
    const evidencePack = (
      await request(context.app.getHttpServer())
        .post('/api/v1/evidence-packs')
        .send({
          organizationId: fixture.organizationId,
          actorUserId: fixture.actorUserId,
          projectId: fixture.project.id,
        })
        .expect(201)
    ).body as { id: string };
    const opportunity = (
      await request(context.app.getHttpServer())
        .post('/api/v1/opportunities')
        .send({
          organizationId: fixture.organizationId,
          actorUserId: fixture.actorUserId,
          projectId: fixture.project.id,
          requisitionId: fixture.requisition.id,
          purchaseOrderId: fixture.purchaseOrder.id,
          evidencePackId: evidencePack.id,
          estimatedCapital: 6000,
          expectedProfit: 1200,
        })
        .expect(201)
    ).body as { id: string };
    const application = (
      await request(context.app.getHttpServer())
        .post('/api/v1/applications')
        .send({
          organizationId: fixture.organizationId,
          actorUserId: fixture.actorUserId,
          opportunityId: opportunity.id,
          requestedCapital: 6000,
          capitalProviderRatio: 0.6,
          entrepreneurRatio: 0.4,
        })
        .expect(201)
    ).body as { id: string };
    const auditorRole = await context.prisma.role.upsert({
      where: { code: 'AUDITOR' },
      create: { code: 'AUDITOR', name: 'Auditor' },
      update: {},
    });
    const auditor = await context.prisma.user.create({
      data: {
        email: `auditor-${Date.now()}@example.test`,
        displayName: 'Integration Auditor',
      },
    });
    await context.prisma.membership.create({
      data: {
        organizationId: fixture.organizationId,
        userId: auditor.id,
        roleId: auditorRole.id,
      },
    });

    await request(context.app.getHttpServer())
      .post(`/api/v1/applications/${application.id}/submit`)
      .send({ actorUserId: fixture.actorUserId })
      .expect(201);
    await request(context.app.getHttpServer())
      .post(`/api/v1/applications/${application.id}/evidence-checklist`)
      .send({ actorUserId: fixture.actorUserId })
      .expect(201);
    await request(context.app.getHttpServer())
      .post(`/api/v1/applications/${application.id}/due-diligence`)
      .send({
        actorUserId: auditor.id,
        reviewerUserId: auditor.id,
        status: 'APPROVED',
        decision: 'APPROVED',
      })
      .expect(403);
    await request(context.app.getHttpServer())
      .post(`/api/v1/applications/${application.id}/due-diligence`)
      .send({
        actorUserId: fixture.actorUserId,
        reviewerUserId: fixture.actorUserId,
        status: 'APPROVED',
        riskRating: 'MEDIUM',
        decision: 'APPROVED',
      })
      .expect(201);
    await request(context.app.getHttpServer())
      .post(`/api/v1/applications/${application.id}/shariah-review`)
      .send({
        actorUserId: fixture.actorUserId,
        reviewerUserId: fixture.actorUserId,
        status: 'APPROVED',
        decision: 'APPROVED',
      })
      .expect(201);
    await request(context.app.getHttpServer())
      .post(`/api/v1/applications/${application.id}/approve`)
      .send({ actorUserId: fixture.actorUserId })
      .expect(201);
    const contract = (
      await request(context.app.getHttpServer())
        .post('/api/v1/contracts')
        .send({
          organizationId: fixture.organizationId,
          actorUserId: fixture.actorUserId,
          applicationId: application.id,
        })
        .expect(201)
    ).body as { id: string };

    await request(context.app.getHttpServer())
      .post('/api/v1/disbursements')
      .send({
        organizationId: fixture.organizationId,
        actorUserId: fixture.actorUserId,
        applicationId: application.id,
        contractId: contract.id,
      })
      .expect(400);

    const generated = (
      await request(context.app.getHttpServer())
        .post(`/api/v1/contracts/${contract.id}/generate-document`)
        .send({
          actorUserId: fixture.actorUserId,
          signerEmail: 'signer@example.test',
        })
        .expect(201)
    ).body as {
      document: { id: string };
      esignPackageRequest: { id: string };
      mockSigningStatus: string;
    };

    expect(generated.document.id).toBeTruthy();
    expect(generated.mockSigningStatus).toBe('PACKAGE_REQUESTED_MOCK');

    await request(context.app.getHttpServer())
      .post(`/api/v1/contracts/${contract.id}/mark-signed`)
      .send({ actorUserId: fixture.actorUserId })
      .expect(201);
    await request(context.app.getHttpServer())
      .post('/api/v1/disbursements')
      .send({
        organizationId: fixture.organizationId,
        actorUserId: auditor.id,
        applicationId: application.id,
        contractId: contract.id,
      })
      .expect(403);

    const outboxEvents = await context.prisma.outboxEvent.findMany({
      where: {
        organizationId: fixture.organizationId,
        eventType: {
          in: [
            'MUDARABAH_CONTRACT_DOCUMENT_GENERATED',
            'ESIGNATURE_PACKAGE_REQUESTED',
          ],
        },
      },
    });
    expect(outboxEvents).toHaveLength(2);
  });

  it('persists an unresolved genuine-loss exception for negative profit/loss', async () => {
    const fixture = await createProcurementFixture(context.app);
    const evidencePack = (
      await request(context.app.getHttpServer())
        .post('/api/v1/evidence-packs')
        .send({
          organizationId: fixture.organizationId,
          actorUserId: fixture.actorUserId,
          projectId: fixture.project.id,
        })
        .expect(201)
    ).body as { id: string };
    const opportunity = (
      await request(context.app.getHttpServer())
        .post('/api/v1/opportunities')
        .send({
          organizationId: fixture.organizationId,
          actorUserId: fixture.actorUserId,
          projectId: fixture.project.id,
          requisitionId: fixture.requisition.id,
          purchaseOrderId: fixture.purchaseOrder.id,
          evidencePackId: evidencePack.id,
          estimatedCapital: 6000,
          expectedProfit: 1200,
        })
        .expect(201)
    ).body as { id: string };
    const application = (
      await request(context.app.getHttpServer())
        .post('/api/v1/applications')
        .send({
          organizationId: fixture.organizationId,
          actorUserId: fixture.actorUserId,
          opportunityId: opportunity.id,
          requestedCapital: 6000,
          capitalProviderRatio: 0.6,
          entrepreneurRatio: 0.4,
        })
        .expect(201)
    ).body as { id: string };

    await request(context.app.getHttpServer())
      .post(`/api/v1/applications/${application.id}/submit`)
      .send({ actorUserId: fixture.actorUserId })
      .expect(201);
    await request(context.app.getHttpServer())
      .post(`/api/v1/applications/${application.id}/evidence-checklist`)
      .send({ actorUserId: fixture.actorUserId })
      .expect(201);
    await request(context.app.getHttpServer())
      .post(`/api/v1/applications/${application.id}/due-diligence`)
      .send({
        actorUserId: fixture.actorUserId,
        reviewerUserId: fixture.actorUserId,
        status: 'APPROVED',
        riskRating: 'MEDIUM',
        decision: 'APPROVED',
      })
      .expect(201);
    await request(context.app.getHttpServer())
      .post(`/api/v1/applications/${application.id}/shariah-review`)
      .send({
        actorUserId: fixture.actorUserId,
        reviewerUserId: fixture.actorUserId,
        status: 'APPROVED',
        decision: 'APPROVED',
      })
      .expect(201);
    await request(context.app.getHttpServer())
      .post(`/api/v1/applications/${application.id}/approve`)
      .send({ actorUserId: fixture.actorUserId })
      .expect(201);
    const contract = (
      await request(context.app.getHttpServer())
        .post('/api/v1/contracts')
        .send({
          organizationId: fixture.organizationId,
          actorUserId: fixture.actorUserId,
          applicationId: application.id,
        })
        .expect(201)
    ).body as { id: string };
    await request(context.app.getHttpServer())
      .post(`/api/v1/contracts/${contract.id}/mark-signed`)
      .send({ actorUserId: fixture.actorUserId })
      .expect(201);
    await request(context.app.getHttpServer())
      .post('/api/v1/disbursements')
      .send({
        organizationId: fixture.organizationId,
        actorUserId: fixture.actorUserId,
        applicationId: application.id,
        contractId: contract.id,
      })
      .expect(201);
    await request(context.app.getHttpServer())
      .post('/api/v1/project-ledgers/entries')
      .send({
        organizationId: fixture.organizationId,
        actorUserId: fixture.actorUserId,
        applicationId: application.id,
        entryType: 'REVENUE',
        description: 'Loss-making delivery revenue',
        amount: 3000,
      })
      .expect(201);

    const statement = (
      await request(context.app.getHttpServer())
        .post('/api/v1/profit-loss/statements')
        .send({
          organizationId: fixture.organizationId,
          actorUserId: fixture.actorUserId,
          applicationId: application.id,
          revenue: 3000,
          costs: 5000,
        })
        .expect(201)
    ).body as {
      id: string;
      netProfit: number;
      distributions: unknown[];
      lossExceptions: Array<{
        id: string;
        exceptionType: string;
        status: string;
        amount: number;
      }>;
    };

    expect(statement.netProfit).toBe(-2000);
    expect(statement.distributions).toEqual([]);
    expect(statement.lossExceptions).toEqual([
      expect.objectContaining({
        exceptionType: 'GENUINE_COMMERCIAL_LOSS',
        status: 'OPEN',
        amount: 2000,
      }),
    ]);

    const persisted = await context.prisma.lossException.findFirstOrThrow({
      where: {
        organizationId: fixture.organizationId,
        applicationId: application.id,
        statementId: statement.id,
      },
    });
    expect(persisted.exceptionType).toBe('GENUINE_COMMERCIAL_LOSS');
    expect(persisted.status).toBe('OPEN');
    expect(persisted.resolvedAt).toBeNull();

    await request(context.app.getHttpServer())
      .post('/api/v1/closures')
      .send({
        organizationId: fixture.organizationId,
        actorUserId: fixture.actorUserId,
        applicationId: application.id,
      })
      .expect(400)
      .expect((response) => {
        expect(response.body).toEqual(
          expect.objectContaining({
            code: 'WORKFLOW_RULE_VIOLATION',
            requiredState: 'All loss exceptions must be RESOLVED or REJECTED',
          }),
        );
      });

    await request(context.app.getHttpServer())
      .post(`/api/v1/loss-exceptions/${persisted.id}/evidence`)
      .send({
        actorUserId: fixture.actorUserId,
        evidenceRefs: {
          statementId: statement.id,
        },
      })
      .expect(201);
    await request(context.app.getHttpServer())
      .post(`/api/v1/loss-exceptions/${persisted.id}/decision`)
      .send({
        actorUserId: fixture.actorUserId,
        reviewerUserId: fixture.actorUserId,
        classification: 'GENUINE_COMMERCIAL_LOSS',
        rationale: 'Negative P/L is accepted as genuine commercial loss.',
      })
      .expect(201);
    await request(context.app.getHttpServer())
      .post(`/api/v1/loss-exceptions/${persisted.id}/close`)
      .send({
        actorUserId: fixture.actorUserId,
        notes: 'Resolved for closure gate.',
      })
      .expect(201);

    await request(context.app.getHttpServer())
      .post('/api/v1/closures')
      .send({
        organizationId: fixture.organizationId,
        actorUserId: fixture.actorUserId,
        applicationId: application.id,
      })
      .expect(201);
  });

  it('exposes audited loss exception reviewer lifecycle endpoints', async () => {
    const fixture = await createProcurementFixture(context.app);
    const evidencePack = (
      await request(context.app.getHttpServer())
        .post('/api/v1/evidence-packs')
        .send({
          organizationId: fixture.organizationId,
          actorUserId: fixture.actorUserId,
          projectId: fixture.project.id,
        })
        .expect(201)
    ).body as { id: string };
    const opportunity = (
      await request(context.app.getHttpServer())
        .post('/api/v1/opportunities')
        .send({
          organizationId: fixture.organizationId,
          actorUserId: fixture.actorUserId,
          projectId: fixture.project.id,
          requisitionId: fixture.requisition.id,
          purchaseOrderId: fixture.purchaseOrder.id,
          evidencePackId: evidencePack.id,
          estimatedCapital: 6000,
          expectedProfit: 1200,
        })
        .expect(201)
    ).body as { id: string };
    const application = (
      await request(context.app.getHttpServer())
        .post('/api/v1/applications')
        .send({
          organizationId: fixture.organizationId,
          actorUserId: fixture.actorUserId,
          opportunityId: opportunity.id,
          requestedCapital: 6000,
          capitalProviderRatio: 0.6,
          entrepreneurRatio: 0.4,
        })
        .expect(201)
    ).body as { id: string };

    const auditorRole = await context.prisma.role.upsert({
      where: { code: 'AUDITOR' },
      create: { code: 'AUDITOR', name: 'Auditor' },
      update: {},
    });
    const shariahRole = await context.prisma.role.upsert({
      where: { code: 'SHARIAH_REVIEWER' },
      create: { code: 'SHARIAH_REVIEWER', name: 'Shariah Reviewer' },
      update: {},
    });
    const unique = Date.now();
    const auditor = await context.prisma.user.create({
      data: {
        email: `loss-auditor-${unique}@example.test`,
        displayName: 'Loss Auditor',
      },
    });
    const reviewer = await context.prisma.user.create({
      data: {
        email: `loss-reviewer-${unique}@example.test`,
        displayName: 'Loss Reviewer',
      },
    });
    await context.prisma.membership.createMany({
      data: [
        {
          organizationId: fixture.organizationId,
          userId: auditor.id,
          roleId: auditorRole.id,
        },
        {
          organizationId: fixture.organizationId,
          userId: reviewer.id,
          roleId: shariahRole.id,
        },
      ],
    });

    const created = (
      await request(context.app.getHttpServer())
        .post('/api/v1/loss-exceptions')
        .send({
          organizationId: fixture.organizationId,
          actorUserId: fixture.actorUserId,
          applicationId: application.id,
          classification: 'breach',
          amount: 1000,
          notes: 'Potential restricted-use breach for reviewer workflow.',
        })
        .expect(201)
    ).body as { id: string; exceptionType: string; status: string };
    expect(created).toEqual(
      expect.objectContaining({
        exceptionType: 'BREACH',
        status: 'OPEN',
      }),
    );

    const listed = (
      await request(context.app.getHttpServer())
        .get('/api/v1/loss-exceptions')
        .query({
          organizationId: fixture.organizationId,
          applicationId: application.id,
          actorUserId: auditor.id,
        })
        .expect(200)
    ).body as Array<{ id: string }>;
    expect(listed.map((item) => item.id)).toContain(created.id);

    await request(context.app.getHttpServer())
      .get(`/api/v1/loss-exceptions/${created.id}`)
      .query({ actorUserId: auditor.id })
      .expect(200);

    const underReview = (
      await request(context.app.getHttpServer())
        .post(`/api/v1/loss-exceptions/${created.id}/evidence`)
        .send({
          actorUserId: auditor.id,
          notes: 'Reviewer evidence references attached.',
          evidenceRefs: {
            evidenceItemIds: ['evidence-1'],
          },
        })
        .expect(201)
    ).body as { status: string };
    expect(underReview.status).toBe('UNDER_REVIEW');

    await request(context.app.getHttpServer())
      .post(`/api/v1/loss-exceptions/${created.id}/decision`)
      .send({
        actorUserId: auditor.id,
        reviewerUserId: auditor.id,
        classification: 'NEGLIGENCE',
        rationale: 'Auditor can review evidence but cannot classify.',
      })
      .expect(403);

    const classified = (
      await request(context.app.getHttpServer())
        .post(`/api/v1/loss-exceptions/${created.id}/decision`)
        .send({
          actorUserId: reviewer.id,
          reviewerUserId: reviewer.id,
          classification: 'NEGLIGENCE',
          decision: 'CLASSIFIED_FOR_REMEDY',
          rationale: 'Evidence indicates process negligence, not fixed return.',
        })
        .expect(201)
    ).body as {
      exceptionType: string;
      status: string;
      reviewerUserId: string;
    };
    expect(classified).toEqual(
      expect.objectContaining({
        exceptionType: 'NEGLIGENCE',
        status: 'CLASSIFIED',
        reviewerUserId: reviewer.id,
      }),
    );

    const resolved = (
      await request(context.app.getHttpServer())
        .post(`/api/v1/loss-exceptions/${created.id}/close`)
        .send({
          actorUserId: reviewer.id,
          notes: 'Reviewer decision recorded for closure-gate evaluation.',
        })
        .expect(201)
    ).body as { status: string; resolvedAt: string | null };
    expect(resolved.status).toBe('RESOLVED');
    expect(resolved.resolvedAt).toBeTruthy();

    const auditEvents = await context.prisma.auditEvent.findMany({
      where: {
        entityType: 'LossException',
        entityId: created.id,
        eventType: {
          in: [
            'LOSS_EXCEPTION_CREATED',
            'LOSS_EXCEPTION_EVIDENCE_ATTACHED',
            'LOSS_EXCEPTION_CLASSIFIED',
            'LOSS_EXCEPTION_RESOLVED',
          ],
        },
      },
    });
    const outboxEvents = await context.prisma.outboxEvent.findMany({
      where: {
        aggregateType: 'LossException',
        aggregateId: created.id,
        eventType: {
          in: [
            'LOSS_EXCEPTION_CREATED',
            'LOSS_EXCEPTION_EVIDENCE_ATTACHED',
            'LOSS_EXCEPTION_CLASSIFIED',
            'LOSS_EXCEPTION_RESOLVED',
          ],
        },
      },
    });
    expect(auditEvents).toHaveLength(4);
    expect(outboxEvents).toHaveLength(4);
  });
});
