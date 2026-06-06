import { expect, type Page, test } from '@playwright/test';

import {
  createProcurementViaApi,
  resetDatabase,
  setSession,
} from './helpers';

test.beforeEach(async () => {
  await resetDatabase();
});

test('UAT-DEMO-001 guided demo mode walks reviewer through real routes', async ({
  page,
  request,
}) => {
  const fixture = await createProcurementViaApi(request);
  await setSession(page, fixture);

  await page.goto('/dashboard');
  await page.getByRole('button', { name: /demo guide/i }).click();

  await expect(
    page.getByRole('heading', { name: 'Guided demo mode' }),
  ).toBeVisible();
  await expect(page.getByText('Dashboard overview')).toBeVisible();
  await expect(page.getByText('Fabric hash-record proof panel')).toBeVisible();
  await expect(
    demoGuideStep(page, 'Fabric hash-record proof panel').getByText(
      'Environment-gated',
    ).first(),
  ).toBeVisible();
  await expect(page.getByText('verified=true from mock')).toHaveCount(0);
  await expect(page.getByText('Fabric proof complete')).toHaveCount(0);

  await openGuideStep(page, 'Dashboard overview');
  await expect(page).toHaveURL(/\/dashboard$/);

  await openGuideStep(page, 'Procurement Hub summary');
  await expect(page).toHaveURL(/\/procurement\/projects$/);

  await openGuideStep(page, 'Finance opportunities');
  await expect(page).toHaveURL(/\/finance\/opportunities$/);

  await openGuideStep(page, 'Fabric hash-record proof panel');
  await expect(page).toHaveURL(/\/evidence\/hashes$/);
  await expect(
    demoGuideStep(page, 'Fabric hash-record proof panel').getByText(
      'Environment-gated',
    ).first(),
  ).toBeVisible();

  await openGuideStep(page, 'Graph anchor, risk, and saved-view overlay');
  await expect(page).toHaveURL(/\/graph\/projects$/);

  await openGuideStep(page, 'Reports JSON export');
  await expect(page).toHaveURL(/\/reports$/);

  await openGuideStep(page, 'Operations health and status');
  await expect(page).toHaveURL(/\/operations$/);

  await page.screenshot({
    path: 'docs/evidence/uat/guided-demo-mode.png',
    fullPage: true,
  });
});

async function openGuideStep(page: Page, title: string) {
  await demoGuideStep(page, title)
    .getByRole('link', { name: 'Open route' })
    .click();
}

function demoGuideStep(page: Page, title: string) {
  return page.locator('.demo-guide-step').filter({ hasText: title });
}
