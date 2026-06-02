import request from 'supertest';
import { createOrganizationFixture } from './helpers/api-workflow-fixtures';
import {
  closeIntegrationApp,
  createIntegrationApp,
  type IntegrationAppContext,
} from './helpers/integration-test-context';

describe('Integration: outbox and Redis queue', () => {
  let context: IntegrationAppContext;

  beforeAll(async () => {
    context = await createIntegrationApp();
  });

  afterAll(async () => {
    await closeIntegrationApp(context);
  });

  it('creates outbox events, rejects duplicate idempotency keys, and uses Redis queue storage', async () => {
    const setup = await createOrganizationFixture(context.app);
    const payload = {
      organizationId: setup.organization.id,
      actorUserId: setup.adminUser.id,
      entityType: 'PurchaseOrder',
      entityId: 'po-outbox-integration',
      canonicalHash: 'abc123integration',
    };

    const created = (
      await request(context.app.getHttpServer())
        .post('/api/v1/integrations/fabric/anchors')
        .send(payload)
        .expect(201)
    ).body as { id: string; idempotencyKey: string };

    await request(context.app.getHttpServer())
      .post('/api/v1/integrations/fabric/anchors')
      .send(payload)
      .expect(409);

    const outboxEvent = await context.prisma.outboxEvent.findUnique({
      where: { id: created.id },
    });
    expect(outboxEvent).toEqual(
      expect.objectContaining({
        status: 'PENDING',
        eventType: 'FABRIC_ANCHOR_REQUESTED',
      }),
    );

    const auditEvent = await context.prisma.auditEvent.findFirst({
      where: {
        eventType: 'FABRIC_ANCHOR_REQUESTED',
        entityType: 'PurchaseOrder',
        entityId: 'po-outbox-integration',
        correlationId: created.id,
      },
    });
    expect(auditEvent).toEqual(
      expect.objectContaining({
        organizationId: setup.organization.id,
        actorUserId: setup.adminUser.id,
      }),
    );

    const listedOutbox = (
      await request(context.app.getHttpServer())
        .get('/api/v1/integrations/outbox')
        .query({ organizationId: setup.organization.id })
        .expect(200)
    ).body as Array<{ id: string; displayStatus: string }>;
    expect(listedOutbox).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: created.id,
          displayStatus: 'PENDING',
        }),
      ]),
    );

    await context.prisma.outboxEvent.update({
      where: {
        id: created.id,
      },
      data: {
        attempts: 1,
        lastError: 'Mock provider timeout',
        status: 'PENDING',
      },
    });

    await context.prisma.integrationReconciliationRecord.create({
      data: {
        organizationId: setup.organization.id,
        outboxEventId: created.id,
        integrationType: 'FABRIC',
        aggregateType: 'PurchaseOrder',
        aggregateId: 'po-outbox-integration',
        externalReference: 'mock-tx-outbox',
        status: 'FAILED',
        requestPayload: payload,
        responsePayload: {
          status: 'TIMEOUT',
        },
        lastError: 'Mock provider timeout',
        attempts: 1,
      },
    });

    const retryingOutbox = (
      await request(context.app.getHttpServer())
        .get(`/api/v1/integrations/outbox/${created.id}`)
        .expect(200)
    ).body as {
      displayStatus: string;
      reconciliationRecord: { status: string };
    };
    expect(retryingOutbox.displayStatus).toBe('RETRYING');
    expect(retryingOutbox.reconciliationRecord.status).toBe('FAILED');

    const reconciliation = (
      await request(context.app.getHttpServer())
        .get('/api/v1/integrations/reconciliation')
        .query({ organizationId: setup.organization.id })
        .expect(200)
    ).body as Array<{ outboxEventId: string; lastError: string }>;
    expect(reconciliation).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          outboxEventId: created.id,
          lastError: 'Mock provider timeout',
        }),
      ]),
    );

    await context.redisQueue.enqueue('integration', {
      outboxEventId: created.id,
    });
    await expect(context.redisQueue.size('integration')).resolves.toBe(1);
    await expect(
      context.redisQueue.dequeue<{ outboxEventId: string }>('integration'),
    ).resolves.toEqual({
      outboxEventId: created.id,
    });
  });
});
