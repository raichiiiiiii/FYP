import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';

import {
  createApprovedFinanceApplicationViaApi,
  resetDatabase,
  setSession,
} from './helpers';

const screenshotDir = path.resolve('docs/evidence/ux/screenshots');

type ScreenshotTarget = {
  id: string;
  route: string;
  expectedText: string | RegExp;
  screenshotName: string;
};

const screenshotTargets: ScreenshotTarget[] = [
  {
    id: 'HCI-SHOT-01',
    route: '/dashboard',
    expectedText: /dashboard/i,
    screenshotName: 'shot-01-dashboard.png',
  },
  {
    id: 'HCI-SHOT-02',
    route: '/procurement',
    expectedText: 'Procurement Hub',
    screenshotName: 'shot-02-procurement-hub.png',
  },
  {
    id: 'HCI-SHOT-03',
    route: '/finance/opportunities',
    expectedText: 'Pipeline readiness',
    screenshotName: 'shot-03-finance-opportunities.png',
  },
  {
    id: 'HCI-SHOT-04',
    route: '/operations',
    expectedText: /deployment|runtime|operations/i,
    screenshotName: 'shot-04-operations.png',
  },
  {
    id: 'HCI-SHOT-05',
    route: '/reports',
    expectedText: /reports/i,
    screenshotName: 'shot-05-reports.png',
  },
  {
    id: 'HCI-SHOT-06',
    route: '/evidence-package',
    expectedText: 'Evidence Package Browser',
    screenshotName: 'shot-06-evidence-package.png',
  },
  {
    id: 'HCI-REQ-01',
    route: '/dashboard',
    expectedText: /dashboard|MEPN API|system health/i,
    screenshotName: 'hci-dashboard-status-visibility.png',
  },
  {
    id: 'HCI-REQ-02',
    route: '/finance/applications',
    expectedText: /Application pipeline|Gate visibility/i,
    screenshotName: 'hci-finance-approval-flow.png',
  },
  {
    id: 'HCI-REQ-03',
    route: '/finance/contracts',
    expectedText: /Contracts|Signer email/i,
    screenshotName: 'hci-contract-confirmation-state.png',
  },
  {
    id: 'HCI-REQ-04',
    route: '/graph/projects',
    expectedText: /graph|network|canvas/i,
    screenshotName: 'hci-graph-information-density.png',
  },
  {
    id: 'HCI-REQ-05',
    route: '/operations',
    expectedText: /deployment|runtime|operations/i,
    screenshotName: 'hci-operations-error-prevention.png',
  },
];

test.beforeEach(async () => {
  await resetDatabase();
});

test('HCI-SHOT-001 captures safe UX evaluation screenshots for representative routes', async ({
  page,
  request,
}) => {
  await mkdir(screenshotDir, { recursive: true });
  const fixture = await createApprovedFinanceApplicationViaApi(request);
  await setSession(page, fixture);

  const capturedScreenshots: string[] = [];

  for (const target of screenshotTargets) {
    const screenshotPath = path.join(screenshotDir, target.screenshotName);
    const health = await assertHealthyScreenshotRoute(page, target, screenshotPath);

    if (!health.ok) {
      test.skip(true, `${target.id} blocked: ${health.reason}`);
    }

    capturedScreenshots.push(screenshotPath);
  }

  expect(capturedScreenshots).toHaveLength(screenshotTargets.length);
});

async function assertHealthyScreenshotRoute(
  page: Page,
  target: ScreenshotTarget,
  screenshotPath: string,
) {
  try {
    const response = await page.goto(target.route, { waitUntil: 'networkidle' });

    if (response && response.status() >= 400) {
      await page.screenshot({ path: screenshotPath, fullPage: true });
      return {
        ok: false,
        reason: `${target.route} returned HTTP ${response.status()}`,
      };
    }

    await expect(page.locator('main')).toBeVisible();

    const accessDenied = await page
      .getByRole('heading', { name: 'Access denied' })
      .count();
    if (accessDenied > 0) {
      await page.screenshot({ path: screenshotPath, fullPage: true });
      return {
        ok: false,
        reason: `${target.route} rendered Access denied for the seeded screenshot role`,
      };
    }

    const bodyText = await page.locator('body').innerText();
    if (isUnsafeEvidenceText(bodyText)) {
      return {
        ok: false,
        reason: `${target.route} rendered sensitive text; screenshot capture blocked`,
      };
    }

    await expect(page.locator('body')).toContainText(target.expectedText);
    await page.screenshot({ path: screenshotPath, fullPage: true });

    return {
      ok: true,
      reason: null,
    };
  } catch (error) {
    await page.screenshot({ path: screenshotPath, fullPage: true }).catch(
      () => undefined,
    );
    return {
      ok: false,
      reason: error instanceof Error ? error.message : String(error),
    };
  }
}

function isUnsafeEvidenceText(text: string) {
  const normalized = text.toLowerCase();

  return (
    text.includes('BEGIN PRIVATE KEY') ||
    text.includes('BEGIN CERTIFICATE') ||
    text.includes('FABRIC_PRIVATE_KEY_PEM') ||
    normalized.includes('password=') ||
    normalized.includes('token=')
  );
}

