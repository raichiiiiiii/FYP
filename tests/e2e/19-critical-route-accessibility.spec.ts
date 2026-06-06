import { expect, test, type Page, type TestInfo } from '@playwright/test';

import {
  expectKeyboardFocusMoves,
  expectNoAccessibilityViolations,
} from './accessibility.helpers';
import {
  createApprovedFinanceApplicationViaApi,
  createOrganizationViaApi,
  createProcurementViaApi,
  resetDatabase,
  setSession,
} from './helpers';

test.beforeEach(async () => {
  await resetDatabase();
});

test('A11Y-CRIT-001 dashboard route is keyboard and axe accessible', async ({
  page,
  request,
}, testInfo) => {
  const session = await createOrganizationViaApi(request, 'A11Y Dashboard SME');
  await setSession(page, session);

  await checkCriticalRoute(page, testInfo, '/dashboard');
});

test('A11Y-CRIT-002 procurement hub route is keyboard and axe accessible', async ({
  page,
  request,
}, testInfo) => {
  const fixture = await createProcurementViaApi(request);
  await setSession(page, fixture);

  await checkCriticalRoute(page, testInfo, '/procurement');
});

test('A11Y-CRIT-003 finance workspace route is keyboard and axe accessible', async ({
  page,
  request,
}, testInfo) => {
  const fixture = await createApprovedFinanceApplicationViaApi(request);
  await setSession(page, fixture);

  await checkCriticalRoute(
    page,
    testInfo,
    `/finance/applications/${fixture.application.id}`,
  );
});

test('A11Y-CRIT-004 audit and evidence routes are keyboard and axe accessible', async ({
  page,
  request,
}, testInfo) => {
  const fixture = await createApprovedFinanceApplicationViaApi(request);
  await setSession(page, fixture);

  await checkCriticalRoute(page, testInfo, '/audit');
  await checkCriticalRoute(page, testInfo, '/evidence/hashes');
});

test('A11Y-CRIT-005 graph route is keyboard and axe accessible', async ({
  page,
  request,
}, testInfo) => {
  const fixture = await createApprovedFinanceApplicationViaApi(request);
  await setSession(page, fixture);

  await checkCriticalRoute(page, testInfo, '/graph/projects');
});

test('A11Y-CRIT-006 reports route is keyboard and axe accessible', async ({
  page,
  request,
}, testInfo) => {
  const fixture = await createApprovedFinanceApplicationViaApi(request);
  await setSession(page, fixture);

  await checkCriticalRoute(page, testInfo, '/reports');
});

test('A11Y-CRIT-007 admin users route is keyboard and axe accessible', async ({
  page,
  request,
}, testInfo) => {
  const session = await createOrganizationViaApi(request, 'A11Y Admin SME');
  await setSession(page, session);

  await checkCriticalRoute(page, testInfo, '/admin/users');
});

async function checkCriticalRoute(
  page: Page,
  testInfo: TestInfo,
  path: string,
) {
  await page.goto(path);
  await expect(page.locator('main')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Access denied' })).toHaveCount(
    0,
  );
  await expectKeyboardFocusMoves(page);
  await expectNoAccessibilityViolations(page, testInfo);
}
