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
});
