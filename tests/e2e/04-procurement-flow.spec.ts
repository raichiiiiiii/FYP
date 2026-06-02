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

test('SRS-PROC-001 user completes source-to-pay flow and sees audit events', async ({
  page,
  request,
}) => {
  const session = await createOrganizationViaApi(request, 'E2E Procurement SME');
  const suffix = uniqueSuffix();
  const supplierName = `E2E Supplier ${suffix}`;
  const projectName = `E2E Project ${suffix}`;
  const requisitionTitle = `E2E Requisition ${suffix}`;
  const rfqTitle = `E2E RFQ ${suffix}`;
  const poNumber = `PO-E2E-${suffix}`;
  const invoiceNumber = `INV-E2E-${suffix}`;

  await setSession(page, session);

  await page.goto('/procurement/suppliers');
  await page.getByLabel('Name').fill(supplierName);
  await page.getByLabel('Email').fill(`supplier-${suffix}@example.test`);
  await page.getByRole('button', { name: 'Create supplier' }).click();
  await expect(page.getByText('Supplier created')).toBeVisible();

  await page.goto('/procurement/projects');
  await page.getByLabel('Name').fill(projectName);
  await page.getByLabel('Code').fill(`PRJ-${suffix}`);
  await page.getByLabel('Budget').fill('12000');
  await page.getByRole('button', { name: 'Create project' }).click();
  await expect(page.getByText('Project created')).toBeVisible();

  await page.goto('/procurement/requisitions/new');
  await page.getByLabel('Title').fill(requisitionTitle);
  await page.getByLabel('Project').selectOption({ label: projectName });
  await page.getByLabel('Justification').fill('E2E procurement lifecycle');
  await page.getByLabel('Item description').fill('Certified equipment');
  await page.getByLabel('Quantity').fill('2');
  await page.getByLabel('Unit price').fill('3000');
  await page.getByRole('button', { name: 'Create requisition' }).click();

  await expect(page).toHaveURL(/\/procurement\/requisitions$/);
  const requisitionRow = page.locator('article').filter({
    hasText: requisitionTitle,
  });
  await requisitionRow.getByRole('button', { name: 'Submit' }).click();
  await expect(page.getByText('Requisition submit complete')).toBeVisible();
  await requisitionRow.getByRole('button', { name: 'Approve' }).click();
  await expect(page.getByText('Requisition approve complete')).toBeVisible();

  await page.goto('/procurement/rfqs');
  await page.getByLabel('Approved requisition').selectOption({
    label: requisitionTitle,
  });
  await page.getByLabel('Title').fill(rfqTitle);
  await page.getByRole('button', { name: 'Create RFQ' }).click();
  await expect(page.getByText('RFQ created')).toBeVisible();
  await page
    .locator('article')
    .filter({ hasText: rfqTitle })
    .getByRole('button', { name: 'Publish' })
    .click();
  await expect(page.getByText('RFQ published')).toBeVisible();

  await page.goto('/procurement/quotations');
  await page.getByLabel('Published RFQ').selectOption({ label: rfqTitle });
  await page.getByLabel('Supplier').selectOption({ label: supplierName });
  await page.getByLabel('Quote unit price').fill('3000');
  await page.getByRole('button', { name: 'Record quotation' }).click();
  await expect(page.getByText('Quotation recorded')).toBeVisible();

  await page.goto('/procurement/purchase-orders');
  await page.getByLabel('PO number').fill(poNumber);
  await page.getByRole('button', { name: 'Create PO' }).click();
  await expect(page.getByText('Purchase order created')).toBeVisible();
  await page
    .locator('article')
    .filter({ hasText: poNumber })
    .getByRole('button', { name: 'Issue' })
    .click();
  await expect(page.getByText('Purchase order issued')).toBeVisible();

  await page.goto('/procurement/receipts');
  await page.getByLabel('Issued PO').selectOption({ label: poNumber });
  await page.getByLabel('Notes').fill('E2E receipt complete');
  await page.getByRole('button', { name: 'Record receipt' }).click();
  await expect(page.getByText('Receipt recorded')).toBeVisible();

  await page.goto('/procurement/invoices');
  await page.getByLabel('Received PO').selectOption({ label: poNumber });
  await page.getByLabel('Invoice number').fill(invoiceNumber);
  await page.getByLabel('Amount').fill('6000');
  await page.getByRole('button', { name: 'Record invoice' }).click();
  await expect(page.getByText('Invoice recorded')).toBeVisible();

  await page.goto('/audit');
  await expect(page.getByText('INVOICE_RECORDED')).toBeVisible();
  await expect(page.getByText('PURCHASE_ORDER_ISSUED')).toBeVisible();
});
