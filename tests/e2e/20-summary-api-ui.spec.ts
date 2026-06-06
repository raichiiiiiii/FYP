import { expect, test } from '@playwright/test';
import {
  createProcurementViaApi,
  resetDatabase,
  setSession,
} from './helpers';

test.beforeEach(async () => {
  await resetDatabase();
});

test('SRS-SUMMARY-001 procurement and finance surfaces render backend summary DTOs', async ({
  page,
  request,
}) => {
  const fixture = await createProcurementViaApi(request);
  await setSession(page, fixture);

  await page.goto('/procurement');
  await expect(page.getByRole('heading', { name: 'Procurement Hub' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Backend queue' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Review readiness' })).toBeVisible();
  await page.screenshot({
    path: 'docs/evidence/uat/summary-procurement-hub.png',
    fullPage: true,
  });

  await page.goto('/finance/opportunities');
  await expect(
    page.getByRole('heading', { name: 'Pipeline readiness' }),
  ).toBeVisible();
  await expect(page.getByText('Backend finance summary')).toBeVisible();
  await page.screenshot({
    path: 'docs/evidence/uat/summary-finance-panel.png',
    fullPage: true,
  });
});
