import { expect, test } from '@playwright/test';
import {
  createOrganizationViaApi,
  createUserSessionWithRole,
  resetDatabase,
  setSession,
} from './helpers';

test.beforeEach(async () => {
  await resetDatabase();
});

test('SRS-INT-001 integrations queue actions through outbox and expose retry-ready status', async ({
  page,
  request,
}) => {
  const adminSession = await createOrganizationViaApi(request);
  const auditorSession = await createUserSessionWithRole(
    request,
    adminSession,
    'AUDITOR',
  );

  await setSession(page, adminSession);
  await page.goto('/integrations');
  await expect(
    page.getByRole('heading', { name: 'Outbox adapter control' }),
  ).toBeVisible();
  const fabricRuntime = page
    .locator('.status-card-section')
    .filter({ hasText: 'Fabric runtime mode' });
  await expect(fabricRuntime.getByText('Fabric Gateway mode')).toBeVisible();
  await expect(fabricRuntime.getByText('Mock adapter')).toBeVisible();
  await expect(
    page.locator('section[aria-label="Fabric runtime configuration"]'),
  ).toContainText('document hashes and minimal metadata only');

  const fabricPanel = page
    .locator('.integration-action-panel')
    .filter({ hasText: 'Mock Fabric anchor' });
  await fabricPanel.getByLabel('Entity ID').fill('po-e2e-integration');
  await fabricPanel
    .getByLabel('Canonical SHA-256 hash')
    .fill('abc123e2eintegrationhash');
  await fabricPanel.getByRole('button', { name: 'Request anchor' }).click();

  await expect(page.getByText('Fabric anchor request queued.')).toBeVisible();
  await expect(page.getByText('FABRIC_ANCHOR_REQUESTED')).toBeVisible();
  await expect(page.getByText('PurchaseOrder / po-e2e-integration')).toBeVisible();
  await expect(page.getByText('PENDING').first()).toBeVisible();

  await fabricPanel.getByRole('button', { name: 'Request anchor' }).click();
  await expect(
    page.getByText('Outbox idempotency key already exists'),
  ).toBeVisible();

  await setSession(page, auditorSession);
  await page.goto('/integrations');
  await expect(page.getByText('Read-only integration view')).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Request anchor' }),
  ).toHaveCount(0);
  await expect(page.getByText('FABRIC_ANCHOR_REQUESTED')).toBeVisible();
});
