import { expect, test } from '@playwright/test';
import {
  createApprovedFinanceApplicationViaApi,
  createProcurementViaApi,
  E2E_API_BASE_URL,
  resetDatabase,
} from './helpers';

test.beforeEach(async () => {
  await resetDatabase();
});

test('SRS-WORKFLOW-001 backend rejects non-revenue opportunity bypass attempts', async ({
  request,
}) => {
  const fixture = await createProcurementViaApi(request);
  const response = await request.post(`${E2E_API_BASE_URL}/opportunities`, {
    data: {
      organizationId: fixture.organizationId,
      actorUserId: fixture.actorUserId,
      projectId: fixture.project.id,
      title: 'Invalid internal-consumption opportunity',
      estimatedCapital: 5000,
      expectedProfit: 0,
    },
  });

  expect(response.status()).toBe(400);
  const responseBody = await response.json();
  expect(responseBody.message).toContain('revenue-generating source document');
});

test('SRS-WORKFLOW-002 backend rejects disbursement before executed contract', async ({
  request,
}) => {
  const fixture = await createApprovedFinanceApplicationViaApi(request);
  const response = await request.post(`${E2E_API_BASE_URL}/disbursements`, {
    data: {
      organizationId: fixture.organizationId,
      actorUserId: fixture.actorUserId,
      applicationId: fixture.application.id,
      amount: 6000,
    },
  });

  expect(response.status()).toBe(400);
  await expect(response.json()).resolves.toMatchObject({
    message: 'Disbursement requires an executed contract',
  });
});
