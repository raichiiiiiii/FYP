import request from 'supertest';
import { createProcurementFixture } from './helpers/api-workflow-fixtures';
import {
  closeIntegrationApp,
  createIntegrationApp,
  type IntegrationAppContext,
} from './helpers/integration-test-context';

describe('Integration: procurement summary', () => {
  let context: IntegrationAppContext;

  beforeAll(async () => {
    context = await createIntegrationApp();
  });

  afterAll(async () => {
    await closeIntegrationApp(context);
  });

  it('returns backend-owned procurement summary DTOs for allowed roles', async () => {
    const fixture = await createProcurementFixture(context.app);

    const response = await request(context.app.getHttpServer())
      .get('/api/v1/procurement/summary')
      .query({
        organizationId: fixture.organizationId,
        roleCodes: 'PROCUREMENT_OFFICER',
      })
      .expect(200);

    expect(
      response.body.metrics.map((metric: { id: string }) => metric.id),
    ).toEqual(
      expect.arrayContaining([
        'procurement-projects',
        'suppliers',
        'requisitions',
        'purchase-orders',
        'matching-exceptions',
      ]),
    );
    expect(response.body.statusBreakdown).toEqual(
      expect.objectContaining({
        CLOSED: 1,
      }),
    );
    expect(
      response.body.readiness.map((item: { id: string }) => item.id),
    ).toEqual([
      'procurement-approval-readiness',
      'procurement-matching-readiness',
    ]);
  });

  it('denies procurement summary to roles without procurement visibility', async () => {
    const fixture = await createProcurementFixture(context.app);

    await request(context.app.getHttpServer())
      .get('/api/v1/procurement/summary')
      .query({
        organizationId: fixture.organizationId,
        roleCodes: 'FINANCIER_USER',
      })
      .expect(403);
  });
});
