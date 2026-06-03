import { expect, test } from '@playwright/test';
import {
  apiPost,
  createApprovedFinanceApplicationViaApi,
  resetDatabase,
  setSession,
} from './helpers';

test.beforeEach(async () => {
  await resetDatabase();
});

test('SRS-FIN-002 contract, ledger, profit/loss, and closure pack flow reaches CLOSED', async ({
  page,
  request,
}) => {
  const fixture = await createApprovedFinanceApplicationViaApi(request);

  await setSession(page, fixture);

  await page.goto('/finance/contracts');
  await page.getByLabel('Application').selectOption(String(fixture.application.id));
  await page
    .getByLabel('Restricted use')
    .fill('Restricted to E2E procurement project costs only');
  await page.getByRole('button', { name: 'Create contract' }).click();
  await expect(page.getByText('Contract created')).toBeVisible();
  await page.getByRole('button', { name: 'Generate document' }).click();
  await expect(
    page.getByText('Mock e-signature package requested'),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Sign' }).click();
  await expect(page.getByText('Contract signed')).toBeVisible();

  const contracts = await request.get(
    `${process.env.E2E_API_BASE_URL ?? 'http://127.0.0.1:3100/api/v1'}/contracts?organizationId=${fixture.organizationId}`,
  );
  expect(contracts.ok()).toBe(true);
  const [contract] = (await contracts.json()) as Array<{ id: string }>;

  await apiPost(request, '/disbursements', {
    organizationId: fixture.organizationId,
    actorUserId: fixture.actorUserId,
    applicationId: fixture.application.id,
    contractId: contract.id,
    amount: 6000,
    reference: 'E2E-DISB-001',
  });

  await page.goto('/finance/ledgers');
  await page.getByLabel('Application').selectOption(String(fixture.application.id));
  await page.getByLabel('Entry type').selectOption('REVENUE');
  await page.getByLabel('Description').fill('E2E project revenue');
  await page.getByLabel('Amount').fill('14000');
  await page.getByRole('button', { name: 'Record entry' }).click();
  await expect(page.getByText('Ledger entry recorded')).toBeVisible();

  await page.goto('/finance/profit-loss');
  await page.getByLabel('Application').selectOption(String(fixture.application.id));
  await page.getByLabel('Revenue override').fill('14000');
  await page.getByLabel('Cost override').fill('6000');
  await page.getByRole('button', { name: 'Generate statement' }).click();
  await expect(page.getByText('Profit/loss statement generated')).toBeVisible();
  const statementRecord = page.locator('.finance-pl-list > article').filter({
    hasText: String(fixture.opportunity.title),
  });
  await expect(
    statementRecord.locator('.finance-ledger-summary article').filter({
      hasText: 'Net',
    }),
  ).toBeVisible();

  await page.goto('/finance/closures');
  await page.getByLabel('Application').selectOption(String(fixture.application.id));
  await page.getByRole('button', { name: 'Export closure' }).click();
  await page.getByRole('button', { name: 'Confirm export' }).click();
  await expect(page.getByText('Closure pack exported')).toBeVisible();
  await expect(
    page
      .locator('article')
      .filter({ hasText: String(fixture.opportunity.title) })
      .locator('.status-tag'),
  ).toContainText('CLOSED');
});
