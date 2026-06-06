import { expect, test } from '@playwright/test';
import {
  createProcurementViaApi,
  resetDatabase,
  setSession,
} from './helpers';

test.beforeEach(async () => {
  await resetDatabase();
});

test('SRS-REPORT-001 reports page loads backend DTOs and downloads JSON export', async ({
  page,
  request,
}) => {
  const session = await createProcurementViaApi(request);
  await setSession(page, session);

  await page.goto('/reports');

  await expect(
    page.getByRole('heading', { name: 'Reports and review packs' }),
  ).toBeVisible();
  await expect(page.getByText('Backend-owned report catalogue')).toBeVisible();
  await expect(page.getByText('JSON export supported')).toBeVisible();
  await expect(page.getByText('Procurement source-to-pay')).toBeVisible();
  await expect(page.getByText('Reports API procurement DTO')).toBeVisible();

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download JSON' }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toContain('procurement-report-');
  expect(download.suggestedFilename()).toContain('.json');
  await expect(
    page.getByText('Procurement source-to-pay JSON export downloaded.'),
  ).toBeVisible();
  await page.screenshot({
    path: 'docs/evidence/uat/reports-json-export-flow.png',
    fullPage: true,
  });
});
