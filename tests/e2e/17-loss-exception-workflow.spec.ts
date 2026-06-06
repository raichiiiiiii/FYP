import { expect, test } from '@playwright/test';
import {
  apiPost,
  createApprovedFinanceApplicationViaApi,
  createUserSessionWithRole,
  resetDatabase,
  setSession,
} from './helpers';

test.beforeEach(async () => {
  await resetDatabase();
});

test('SRS-FIN-LOSS-001 reviewer classifies loss exception before closure', async ({
  page,
  request,
}) => {
  const fixture = await createApprovedFinanceApplicationViaApi(request);
  const reviewer = await createUserSessionWithRole(
    request,
    fixture,
    'SHARIAH_REVIEWER',
  );
  const contract = await apiPost<{ id: string }>(request, '/contracts', {
    organizationId: fixture.organizationId,
    actorUserId: fixture.actorUserId,
    applicationId: fixture.application.id,
  });

  await apiPost(request, `/contracts/${contract.id}/mark-signed`, {
    actorUserId: fixture.actorUserId,
  });
  await apiPost(request, '/disbursements', {
    organizationId: fixture.organizationId,
    actorUserId: fixture.actorUserId,
    applicationId: fixture.application.id,
    contractId: contract.id,
  });
  await apiPost(request, '/project-ledgers/entries', {
    organizationId: fixture.organizationId,
    actorUserId: fixture.actorUserId,
    applicationId: fixture.application.id,
    entryType: 'REVENUE',
    description: 'Loss-making delivery revenue',
    amount: 3000,
  });
  await apiPost(request, '/profit-loss/statements', {
    organizationId: fixture.organizationId,
    actorUserId: fixture.actorUserId,
    applicationId: fixture.application.id,
    revenue: 3000,
    costs: 5000,
  });

  await setSession(page, reviewer);
  await page.goto(`/finance/applications/${fixture.application.id}/closure`);

  await expect(
    page.getByRole('heading', { name: 'Reviewer classification' }),
  ).toBeVisible();
  const reviewerPanel = page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'Reviewer classification' }) });
  await expect(page.getByText('Closure blocked')).toBeVisible();
  await expect(
    reviewerPanel.locator('strong').filter({ hasText: 'Genuine commercial loss' }),
  ).toBeVisible();
  await expect(
    reviewerPanel.getByText('does not create a guaranteed or fixed return'),
  ).toBeVisible();

  await reviewerPanel
    .getByRole('button', { name: 'Start evidence review' })
    .click();
  await expect(
    page.getByText('Loss exception evidence review started.'),
  ).toBeVisible();

  await reviewerPanel
    .getByLabel('Rationale')
    .fill('Accepted as genuine commercial loss.');
  await reviewerPanel.getByRole('button', { name: 'Record decision' }).click();
  await expect(page.getByText('Reviewer decision recorded.')).toBeVisible();

  await reviewerPanel.getByRole('button', { name: 'Resolve for closure' }).click();
  await expect(
    page.getByText('Loss exception resolved for closure-gate evaluation.'),
  ).toBeVisible();
  await expect(page.getByText('Closure gate clear')).toBeVisible();

  await page.screenshot({
    path: 'docs/evidence/uat/loss-exception-review-flow.png',
    fullPage: true,
  });
});
