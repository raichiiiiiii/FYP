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

  const organizationId = await page.evaluate(() =>
    window.localStorage.getItem('mepn.organizationId'),
  );
  const actorUserId = await page.evaluate(() =>
    window.localStorage.getItem('mepn.actorUserId'),
  );
  expect(organizationId).toBeTruthy();
  expect(actorUserId).toBeTruthy();

  const auditEvents = await apiGet<Array<{ eventType: string }>>(
    request,
    `/audit-events?organizationId=${organizationId}`,
  );
  expect(auditEvents.some((event) => event.eventType === 'ORGANIZATION_CREATED'))
    .toBe(true);
});
