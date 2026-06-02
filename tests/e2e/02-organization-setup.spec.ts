import { expect, test } from '@playwright/test';
import { apiGet, resetDatabase, uniqueSuffix } from './helpers';

test.beforeEach(async () => {
  await resetDatabase();
});

test('SRS-ID-001 organization setup creates an admin session and audit event', async ({
  page,
  request,
}) => {
  const suffix = uniqueSuffix();
  const legalName = `E2E Setup SME ${suffix}`;

  await page.goto('/org/setup');
  await page.getByLabel('Legal name').fill(legalName);
  await page.getByLabel('Registration number').fill(`REG-${suffix}`);
  await page.getByLabel('Admin display name').fill('E2E Setup Admin');
  await page.getByLabel('Admin email').fill(`setup-${suffix}@example.test`);
  await page.getByRole('button', { name: 'Create organization' }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText(legalName)).toBeVisible();

  const authSession = await page.evaluate(() =>
    JSON.parse(window.localStorage.getItem('mepn.auth.session') || 'null') as {
      organizationId?: string;
      userId?: string;
    } | null,
  );
  expect(authSession?.organizationId).toBeTruthy();
  expect(authSession?.userId).toBeTruthy();

  const auditEvents = await apiGet<Array<{ eventType: string }>>(
    request,
    `/audit-events?organizationId=${authSession?.organizationId}`,
  );
  expect(auditEvents.some((event) => event.eventType === 'ORGANIZATION_CREATED'))
    .toBe(true);
});
