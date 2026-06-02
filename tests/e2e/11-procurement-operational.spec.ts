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

test('SRS-PROC-006 user inspects operational procurement records and matching views', async ({
  page,
  request,
}) => {
  const fixture = await createProcurementViaApi(request);
  const ruleName = `E2E approval rule ${uniqueSuffix()}`;

  await setSession(page, fixture);

  await page.goto(`/procurement/requisitions/${fixture.requisition.id}`);
  await expect(
    page.getByRole('heading', { name: 'Requisition detail' }),
  ).toBeVisible();
  await expect(page.getByText(String(fixture.requisition.title))).toBeVisible();
  await expect(page.getByText('REQUISITION_APPROVED')).toBeVisible();

  await page.goto('/procurement/approval-rules');
  await page.getByLabel('Name').fill(ruleName);
  await page.getByLabel('Minimum amount').fill('0');
  await page.getByLabel('Maximum amount').fill('50000');
  await page.getByLabel('Approver role').fill('APPROVER');
  await page.getByRole('button', { name: 'Save rule' }).click();
  await expect(page.getByText('Approval rule saved')).toBeVisible();
  await expect(page.getByText(ruleName)).toBeVisible();

  await page.goto(`/procurement/suppliers/${fixture.supplier.id}`);
  await expect(
    page.getByRole('heading', { name: 'Supplier detail' }),
  ).toBeVisible();
  await expect(page.getByText(String(fixture.supplier.name))).toBeVisible();
  await expect(page.getByText('SUPPLIER_CREATED')).toBeVisible();

  await page.goto(`/procurement/rfqs/${fixture.rfq.id}`);
  await expect(page.getByRole('heading', { name: 'RFQ detail' })).toBeVisible();
  await expect(page.getByText(String(fixture.rfq.title))).toBeVisible();
  await expect(page.getByText('RFQ_PUBLISHED')).toBeVisible();

  await page.goto('/procurement/quotations/compare');
  await page.getByLabel('RFQ').selectOption({ label: String(fixture.rfq.title) });
  await expect(page.getByText(String(fixture.supplier.name))).toBeVisible();

  await page.goto(`/procurement/purchase-orders/${fixture.purchaseOrder.id}`);
  await expect(
    page.getByRole('heading', { name: 'Purchase order detail' }),
  ).toBeVisible();
  await expect(
    page.getByText(String(fixture.purchaseOrder.poNumber)),
  ).toBeVisible();
  await expect(page.getByText('PURCHASE_ORDER_ISSUED')).toBeVisible();

  await page.goto('/procurement/matching');
  await expect(
    page.getByRole('heading', { name: 'Receipt and invoice matching' }),
  ).toBeVisible();
  await expect(
    page.getByText(String(fixture.purchaseOrder.poNumber)),
  ).toBeVisible();
});
