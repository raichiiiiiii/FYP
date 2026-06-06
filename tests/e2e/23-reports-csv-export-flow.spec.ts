import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import {
  createProcurementViaApi,
  resetDatabase,
  setSession,
} from './helpers';

test.beforeEach(async () => {
  await resetDatabase();
});

test('SRS-REPORT-002 reports page downloads audited CSV export', async ({
  page,
  request,
}) => {
  const session = await createProcurementViaApi(request);
  await setSession(page, session);

  await page.goto('/reports');

  await expect(
    page.getByRole('heading', { name: 'Reports and review packs' }),
  ).toBeVisible();
  await expect(page.getByText('JSON and CSV exports supported')).toBeVisible();
  await expect(page.getByText('Procurement source-to-pay')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Download CSV' })).toBeVisible();

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download CSV' }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toContain('procurement-report-');
  expect(download.suggestedFilename()).toContain('.csv');

  const downloadPath = await download.path();

  expect(downloadPath).toBeTruthy();

  const csv = await readFile(downloadPath!, 'utf8');

  expect(csv.split('\n')[0]).toBe('section,metric,value');
  expect(csv).toContain('report,type,procurement');
  expect(csv).toContain('counts,purchaseOrders,1');
  expect(csv).toContain('counts,invoices,1');

  await expect(
    page.getByText('Procurement source-to-pay CSV export downloaded.'),
  ).toBeVisible();
  await page.screenshot({
    path: 'docs/evidence/uat/reports-csv-export-flow.png',
    fullPage: true,
  });
});
