import { expect, test } from '@playwright/test';
import {
  createOrganizationViaApi,
  resetDatabase,
  setSession,
  uniqueSuffix,
} from './helpers';

test.beforeEach(async () => {
  await resetDatabase();
});

test('SRS-ID-002 admin creates a role, creates a user, and assigns membership', async ({
  page,
  request,
}) => {
  const session = await createOrganizationViaApi(request, 'E2E RBAC SME');
  const suffix = uniqueSuffix();
  const roleName = `Procurement Officer ${suffix}`;
  const displayName = `Procurement User ${suffix}`;
  const email = `procurement-${suffix}@example.test`;

  await setSession(page, session);

  await page.goto('/admin/roles');
  await page
    .getByRole('textbox', { name: 'Code', exact: true })
    .fill(`PROCUREMENT_${suffix}`.replace(/-/g, '_'));
  await page.getByLabel('Name').fill(roleName);
  await page.getByLabel('Description').fill('Runs E2E procurement tasks');
  await page
    .getByLabel('Permission codes')
    .fill('PROCUREMENT_READ,PROCUREMENT_WRITE');
  await page.getByRole('button', { name: 'Create role' }).click();
  await expect(page.getByText('Role created')).toBeVisible();
  await expect(page.getByText(roleName)).toBeVisible();

  await page.goto('/admin/users');
  await page.getByLabel('Display name').fill(displayName);
  await page.getByLabel('Email').fill(email);
  await page.getByRole('button', { name: 'Create user' }).click();
  await expect(page.getByText('User created')).toBeVisible();

  await page.getByLabel('User').selectOption({ label: `${displayName} (${email})` });
  await page.getByLabel('Role').selectOption({ label: roleName });
  await page.getByRole('button', { name: 'Assign role' }).click();

  await expect(page.getByText('Role assigned')).toBeVisible();
  await expect(
    page.locator('article').filter({ hasText: displayName }).filter({
      hasText: roleName,
    }),
  ).toBeVisible();
});
