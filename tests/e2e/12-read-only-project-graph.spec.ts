import { expect, test, type Page } from '@playwright/test';
import {
  createApprovedFinanceApplicationViaApi,
  createUserSessionWithRole,
  resetDatabase,
  setSession,
} from './helpers';

test.beforeEach(async () => {
  await resetDatabase();
});

test('SRS-GRAPH-001 read-only project graph opens source records and hides finance nodes by role', async ({
  page,
  request,
}) => {
  const fixture = await createApprovedFinanceApplicationViaApi(request);
  const procurementOfficer = await createUserSessionWithRole(
    request,
    fixture,
    'PROCUREMENT_OFFICER',
  );

  await setSession(page, fixture);
  await page.goto('/graph/projects');
  await expect(
    page.getByRole('heading', { name: 'Project network canvas' }),
  ).toBeVisible();
  await selectGraphProject(page, String(fixture.project.id));
  await expect(
    page.getByRole('link', { name: new RegExp(String(fixture.project.name)) }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', {
      name: new RegExp(String(fixture.opportunity.title)),
    }),
  ).toBeVisible();

  await page
    .getByRole('link', { name: new RegExp(String(fixture.purchaseOrder.poNumber)) })
    .click();
  await expect(page).toHaveURL(
    new RegExp(`/procurement/purchase-orders/${fixture.purchaseOrder.id}`),
  );

  await setSession(page, procurementOfficer);
  await page.goto('/graph/projects');
  await selectGraphProject(page, String(fixture.project.id));
  await expect(
    page.locator('.graph-summary article').filter({ hasText: 'Finance layer' }),
  ).toContainText('Hidden');
  await expect(page.getByRole('link', { name: /PurchaseOrder/ })).toBeVisible();
  await expect(
    page.getByRole('link', {
      name: new RegExp(String(fixture.opportunity.title)),
    }),
  ).toHaveCount(0);
});

async function selectGraphProject(page: Page, projectId: string) {
  await page
    .locator('.graph-toolbar label')
    .filter({ hasText: 'Project' })
    .locator('select')
    .selectOption(projectId);
}
