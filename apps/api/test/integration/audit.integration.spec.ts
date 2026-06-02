import request from 'supertest';
import { createProcurementFixture } from './helpers/api-workflow-fixtures';
import {
  closeIntegrationApp,
  createIntegrationApp,
  type IntegrationAppContext,
} from './helpers/integration-test-context';

describe('Integration: audit', () => {
  let context: IntegrationAppContext;

  beforeAll(async () => {
    context = await createIntegrationApp();
  });

  afterAll(async () => {
    await closeIntegrationApp(context);
  });

  it('returns organization audit events and entity timelines from PostgreSQL', async () => {
    const fixture = await createProcurementFixture(context.app);

    const organizationEvents = (
      await request(context.app.getHttpServer())
        .get(`/api/v1/audit-events?organizationId=${fixture.organizationId}`)
        .expect(200)
    ).body as Array<{ eventType: string }>;

    const entityTimeline = (
      await request(context.app.getHttpServer())
        .get(
          `/api/v1/audit-events/entity/PurchaseOrder/${fixture.purchaseOrder.id}?organizationId=${fixture.organizationId}`,
        )
        .expect(200)
    ).body as Array<{ eventType: string; entityId: string }>;
    const searchResult = (
      await request(context.app.getHttpServer())
        .get(
          `/api/v1/audit-events/search?organizationId=${fixture.organizationId}&eventType=PURCHASE_ORDER_ISSUED&page=1&pageSize=10`,
        )
        .expect(200)
    ).body as {
      items: Array<{ eventType: string; entityId: string }>;
      total: number;
      page: number;
      pageSize: number;
    };

    expect(organizationEvents.length).toBeGreaterThanOrEqual(12);
    expect(entityTimeline).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          eventType: 'PURCHASE_ORDER_CREATED',
          entityId: fixture.purchaseOrder.id,
        }),
        expect.objectContaining({
          eventType: 'PURCHASE_ORDER_ISSUED',
          entityId: fixture.purchaseOrder.id,
        }),
      ]),
    );
    expect(searchResult).toEqual(
      expect.objectContaining({
        total: expect.any(Number),
        page: 1,
        pageSize: 10,
      }),
    );
    expect(searchResult.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          eventType: 'PURCHASE_ORDER_ISSUED',
          entityId: fixture.purchaseOrder.id,
        }),
      ]),
    );
  });
});
