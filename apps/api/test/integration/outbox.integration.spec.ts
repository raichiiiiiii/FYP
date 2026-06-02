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
