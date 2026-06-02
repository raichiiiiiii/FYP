import { expect, test } from '@playwright/test';
import {
  createEvidencePackViaApi,
  createProcurementViaApi,
  resetDatabase,
  setSession,
  uniqueSuffix,
} from './helpers';

test.beforeEach(async () => {
  await resetDatabase();
});

test('SRS-FIN-001 finance application moves through evidence, review, and approval', async ({
  page,
  request,
}) => {
  const fixture = await createProcurementViaApi(request);
  const evidencePack = await createEvidencePackViaApi(request, fixture);
  const suffix = uniqueSuffix();
  const opportunityTitle = `E2E Finance Opportunity ${suffix}`;

  await setSession(page, fixture);

  await page.goto('/finance/opportunities');
  await page.getByLabel('Project').selectOption(String(fixture.project.id));
  await page
    .getByLabel('Purchase order')
    .selectOption(String(fixture.purchaseOrder.id));
  await page.getByLabel('Evidence pack').selectOption(String(evidencePack.id));
  await page.getByLabel('Title').fill(opportunityTitle);
  await page.getByLabel('Estimated capital').fill('6000');
  await page.getByLabel('Expected profit').fill('1200');
  await page.getByRole('button', { name: 'Create opportunity' }).click();
  await expect(page.getByText('Opportunity created')).toBeVisible();

  await page.goto('/finance/applications');
  await page.getByLabel('Opportunity').selectOption({ label: opportunityTitle });
  await page.getByLabel('Requested capital').fill('6000');
  await page.getByLabel('Capital provider ratio').fill('0.6');
  await page.getByLabel('Entrepreneur ratio').fill('0.4');
  await page.getByRole('button', { name: 'Create application' }).click();
  await expect(page).toHaveURL(/\/finance\/applications\/[^/]+$/);

  await page.goto('/finance/applications');
  const applicationRow = page.locator('article').filter({
    hasText: opportunityTitle,
  });
  await applicationRow.getByRole('button', { name: 'Submit' }).click();
  await expect(page.getByText('Application submitted')).toBeVisible();
  await applicationRow.getByRole('button', { name: 'Open' }).click();

  await expect(
    page.getByRole('heading', { name: 'Application workspace' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Generate checklist' }).click();
  await expect(page.getByText('Checklist generated')).toBeVisible();
  await expect(
    page.locator('article').filter({ hasText: 'Evidence checklist' }),
  ).toContainText('COMPLETED');

  await page.getByRole('button', { name: 'Approve due diligence' }).click();
  await expect(page.getByText('Due diligence approved')).toBeVisible();
  await page.getByRole('button', { name: 'Approve Shariah' }).click();
  await expect(page.getByText('Shariah review approved')).toBeVisible();
  await page.getByRole('button', { name: 'Approve application' }).click();
  await expect(page.getByText('Application approved')).toBeVisible();
  await expect(page.locator('article').filter({ hasText: 'Status' })).toContainText(
    'APPROVED',
  );
});
