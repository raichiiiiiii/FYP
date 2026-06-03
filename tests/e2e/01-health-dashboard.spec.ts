import { expect, test } from '@playwright/test';
import { createOrganizationViaApi, resetDatabase, setSession } from './helpers';

test.beforeEach(async () => {
  await resetDatabase();
});

test('SRS-HEALTH-001 walking skeleton shows API, database, and Redis health', async ({
  page,
  request,
}) => {
  const session = await createOrganizationViaApi(request, 'E2E Health SME');

  await setSession(page, session);
  await page.goto('/dashboard');

  await expect(
    page.getByRole('heading', { name: 'System health dashboard' }),
  ).toBeVisible();
  const healthPanel = page.getByLabel('System health dashboard');
  await expect(healthPanel.getByText('MEPN API')).toBeVisible();
  await expect(healthPanel.getByText('PostgreSQL')).toBeVisible();
  await expect(healthPanel.getByText('Redis', { exact: true })).toBeVisible();
  await expect(healthPanel.getByText('Database status')).toBeVisible();
  await expect(healthPanel.getByText('Redis status')).toBeVisible();
  await expect(healthPanel.getByText('Current environment')).toBeVisible();
  await expect(healthPanel.getByText('mepn-api')).toBeVisible();
});
