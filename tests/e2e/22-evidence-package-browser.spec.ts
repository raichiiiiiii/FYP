import { expect, test } from '@playwright/test';

import {
  createOrganizationViaApi,
  resetDatabase,
  setSession,
} from './helpers';

test.beforeEach(async () => {
  await resetDatabase();
});

test('UAT-EVIDENCE-001 evidence package browser exposes sanitized review evidence', async ({
  page,
  request,
}) => {
  const session = await createOrganizationViaApi(request);
  await setSession(page, session);

  await page.goto('/evidence-package');

  await expect(
    page.getByRole('heading', { name: 'Evidence Package Browser' }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Roadmap Validation' }),
  ).toBeVisible();
  await expect(page.getByText('Fabric Gateway UAT proof')).toBeVisible();
  await expect(page.getByText('Final validation matrix')).toBeVisible();
  await expect(page.getByText('Remaining evidence gaps')).toBeVisible();
  await expect(
    page.locator('.evidence-package-card').filter({
      hasText: 'Remaining evidence gaps',
    }),
  ).toContainText('Production Hardening');

  const bodyText = await page.locator('body').innerText();
  const forbiddenText = [
    'BEGIN PRIVATE KEY',
    'BEGIN CERTIFICATE',
    'PEM',
    ['AZURE', 'VM', 'SSH', 'KEY'].join('_'),
    ['FABRIC', 'PRIVATE', 'KEY', 'PEM'].join('_'),
    `${'password'}=`,
    `${'token'}=`,
  ];

  for (const forbidden of forbiddenText) {
    expect(bodyText).not.toContain(forbidden);
  }

  await page.screenshot({
    path: 'docs/evidence/uat/evidence-package-browser.png',
    fullPage: true,
  });
});
