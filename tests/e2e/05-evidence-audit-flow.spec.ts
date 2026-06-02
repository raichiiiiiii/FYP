import { expect, test } from '@playwright/test';
import {
  createProcurementViaApi,
  resetDatabase,
  setSession,
  uniqueSuffix,
} from './helpers';

test.beforeEach(async () => {
  await resetDatabase();
});

test('SRS-EVID-001 evidence pack, hash verification, and audit timeline work from UI', async ({
  page,
  request,
}) => {
  const fixture = await createProcurementViaApi(request);
  const suffix = uniqueSuffix();
  const packTitle = `E2E Evidence Pack ${suffix}`;

  await setSession(page, fixture);

  await page.goto('/evidence/documents');
  await page.getByLabel('Title').fill(`PO Document ${suffix}`);
  await page.getByLabel('Document type').fill('PURCHASE_ORDER');
  await page.getByLabel('Linked entity type').fill('PurchaseOrder');
  await page.getByLabel('Linked entity ID').fill(fixture.purchaseOrder.id);
  await page.getByLabel('File name').fill(`po-${suffix}.json`);
  await page.getByLabel('Storage URI').fill(`memory://po-${suffix}.json`);
  await page
    .getByLabel('Canonical content JSON')
    .fill(JSON.stringify({ poNumber: fixture.purchaseOrder.poNumber }));
  await page.getByRole('button', { name: 'Register document' }).click();
  await expect(
    page.getByText('Document registered with immutable version'),
  ).toBeVisible();

  await page.goto('/evidence/packs');
  await page.getByLabel('Procurement project').selectOption({
    label: String(fixture.project.name),
  });
  await page.getByLabel('Title').fill(packTitle);
  await page.getByRole('button', { name: 'Generate pack' }).click();
  await expect(page.getByText('Evidence pack generated')).toBeVisible();
  await page
    .locator('article')
    .filter({ hasText: packTitle })
    .getByRole('button', { name: 'Export' })
    .click();
  await expect(page.getByText('Evidence pack exported')).toBeVisible();
  await expect(page.getByText('Export hash:')).toBeVisible();

  await page.goto('/evidence/hashes');
  await page.getByLabel('Entity type').fill('PurchaseOrder');
  await page.getByLabel('Entity ID').fill(fixture.purchaseOrder.id);
  await page.getByRole('button', { name: 'Create hash' }).click();
  await expect(page.getByText('Hash record created')).toBeVisible();
  await page.getByRole('button', { name: 'Verify' }).click();
  await expect(page.getByText(/Verification: valid/)).toBeVisible();

  await page.goto('/evidence/timeline');
  await page.getByLabel('Entity type').fill('PurchaseOrder');
  await page.getByLabel('Entity ID').fill(fixture.purchaseOrder.id);
  await page.getByRole('button', { name: 'Load timeline' }).click();
  await expect(page.getByText('PURCHASE_ORDER_CREATED')).toBeVisible();
  await expect(page.getByText('PURCHASE_ORDER_ISSUED')).toBeVisible();
});
