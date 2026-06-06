import { expect, test } from '@playwright/test';
import {
  apiPost,
  createProcurementViaApi,
  resetDatabase,
  seedHashRecordFabricState,
  setSession,
} from './helpers';

test.beforeEach(async () => {
  await resetDatabase();
});

test('OPS-001 operations page shows sanitized reviewer timeline', async ({
  page,
  request,
}) => {
  const session = await createProcurementViaApi(request);

  await apiPost(request, '/reports/exports', {
    organizationId: session.organizationId,
    actorUserId: session.actorUserId,
    reportType: 'procurement',
    format: 'csv',
  });
  await seedHashRecordFabricState(request, session, 'failed');
  await setSession(page, session);

  await page.goto('/operations');

  await expect(
    page.getByRole('heading', { name: 'Deployment and runtime health' }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Recent runtime events' }),
  ).toBeVisible();
  await expect(page.getByText('procurement csv report completed')).toBeVisible();
  await expect(page.getByText('Fabric anchor FAILED')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Outbox' })).toBeVisible();

  await page.getByRole('button', { name: 'Fabric' }).click();
  await expect(page.getByText('Fabric anchor FAILED')).toBeVisible();
  await expect(
    page.getByText('procurement csv report completed'),
  ).not.toBeVisible();

  await page.getByRole('button', { name: 'Errors only' }).click();
  await expect(page.getByText('Fabric anchor FAILED')).toBeVisible();

  const bodyText = await page.locator('body').innerText();

  expect(bodyText).not.toContain(`BEGIN ${'PRIVATE'} KEY`);
  expect(bodyText).not.toContain(`BEGIN ${'CERTIFICATE'}`);
  expect(bodyText).not.toContain('PEM');
  expect(bodyText.toLowerCase()).not.toContain('password');
  expect(bodyText.toLowerCase()).not.toContain('token');
  expect(bodyText).not.toContain('FABRIC_PRIVATE_KEY_PEM');

  await page.screenshot({
    path: 'docs/evidence/uat/operations-timeline.png',
    fullPage: true,
  });
});
