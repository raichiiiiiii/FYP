import { expect, test } from '@playwright/test';
import { resetDatabase } from './helpers';

test.beforeEach(async () => {
  await resetDatabase();
});

test('SRS-HEALTH-001 walking skeleton shows API, database, and Redis health', async ({
  page,
}) => {
  await page.goto('/dashboard');

  await expect(
    page.getByRole('heading', { name: 'System health dashboard' }),
  ).toBeVisible();
  await expect(page.getByText('MEPN API')).toBeVisible();
  await expect(page.getByText('PostgreSQL')).toBeVisible();
  await expect(page.getByText('Redis', { exact: true })).toBeVisible();
  await expect(page.getByText('Database status')).toBeVisible();
  await expect(page.getByText('Redis status')).toBeVisible();
  await expect(page.getByText('Current environment')).toBeVisible();
  await expect(page.getByText('mepn-api')).toBeVisible();
});
