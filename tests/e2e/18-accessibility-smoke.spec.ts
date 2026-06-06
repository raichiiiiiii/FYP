import { expect, test } from '@playwright/test';

import { expectNoAccessibilityViolations } from './accessibility.helpers';
import { resetDatabase } from './helpers';

test.beforeEach(async () => {
  await resetDatabase();
});

test('A11Y-001 login page has no serious automated accessibility violations', async ({
  page,
}, testInfo) => {
  await page.goto('/login');

  await expect(
    page.getByRole('heading', { name: 'Restricted procurement, compliant financing' }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Sign in to the prototype' })).toBeVisible();

  await expectNoAccessibilityViolations(page, testInfo);
});
