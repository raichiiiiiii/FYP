import request from 'supertest';
import {
  closeIntegrationApp,
  createIntegrationApp,
  type IntegrationAppContext,
} from './helpers/integration-test-context';

describe('Integration: health', () => {
  let context: IntegrationAppContext;

  beforeAll(async () => {
    context = await createIntegrationApp();
  });

  afterAll(async () => {
    await closeIntegrationApp(context);
  });

  it('GET /api/v1/health returns API, database, and Redis status', async () => {
    const response = await request(context.app.getHttpServer())
      .get('/api/v1/health')
      .expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        status: 'ok',
        service: 'mepn-api',
        database: 'ok',
        redis: 'ok',
        environment: 'test',
      }),
    );
  });
});
