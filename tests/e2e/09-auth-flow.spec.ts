import { expect, test } from '@playwright/test';
import { createOrganizationViaApi, resetDatabase } from './helpers';

test.beforeEach(async () => {
  await resetDatabase();
});

test('SRS-AUTH-001 local dev login creates an authenticated application session', async ({
  page,
  request,
}) => {
  const session = await createOrganizationViaApi(request, 'E2E Auth SME');

  await page.goto('/login');
  await page.getByLabel('Email').fill(session.email);
  await page.getByLabel('Organization ID').fill(session.organizationId);
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText(session.legalName)).toBeVisible();

  const storedSession = await page.evaluate(() =>
    JSON.parse(window.localStorage.getItem('mepn.auth.session') || 'null') as {
      userId?: string;
      organizationId?: string;
      roleCodes?: string[];
      permissionCodes?: string[];
      expiresAt?: string;
    } | null,
  );

  expect(storedSession?.userId).toBe(session.actorUserId);
  expect(storedSession?.organizationId).toBe(session.organizationId);
  expect(storedSession?.roleCodes).toContain('ORG_ADMIN');
  expect(storedSession?.permissionCodes).toContain('users:create');
  expect(storedSession?.expiresAt).toBeTruthy();
});
