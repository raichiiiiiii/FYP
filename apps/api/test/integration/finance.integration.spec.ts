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
});
