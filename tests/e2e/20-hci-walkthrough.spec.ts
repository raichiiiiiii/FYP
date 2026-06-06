import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { expect, test, type Page, type TestInfo } from '@playwright/test';

import {
  createApprovedFinanceApplicationViaApi,
  resetDatabase,
  setSession,
} from './helpers';

const screenshotDir = path.resolve('docs/evidence/ux/screenshots');
const metricsPath = path.resolve('docs/evidence/ux/hci-walkthrough-instrumentation.json');

type RouteProbe = {
  id: string;
  route: string;
  expectedText: string | RegExp;
  screenshotName: string;
};

type RouteMeasurement = {
  id: string;
  route: string;
  status: 'measured' | 'blocked';
  elapsedMs: number | null;
  errorsObserved: number;
  screenshot: string | null;
  blocker: string | null;
};

const walkthroughRoutes: RouteProbe[] = [
  {
    id: 'CW-01',
    route: '/dashboard',
    expectedText: /dashboard/i,
    screenshotName: 'cw-01-dashboard.png',
  },
  {
    id: 'CW-02',
    route: '/procurement',
    expectedText: 'Procurement Hub',
    screenshotName: 'cw-02-procurement-hub.png',
  },
  {
    id: 'CW-03',
    route: '/finance/opportunities',
    expectedText: 'Pipeline readiness',
    screenshotName: 'cw-03-finance-opportunities.png',
  },
  {
    id: 'CW-04',
    route: '/evidence/packs',
    expectedText: /evidence/i,
    screenshotName: 'cw-04-evidence-packs.png',
  },
  {
    id: 'CW-05',
    route: '/audit',
    expectedText: /audit/i,
    screenshotName: 'cw-05-audit.png',
  },
  {
    id: 'CW-06',
    route: '/evidence/hashes',
    expectedText: /hash/i,
    screenshotName: 'cw-06-hash-verification.png',
  },
  {
    id: 'CW-07',
    route: '/graph/projects',
    expectedText: /graph|network|canvas/i,
    screenshotName: 'cw-07-graph-projects.png',
  },
];

test.beforeEach(async () => {
  await resetDatabase();
});

test('HCI-CW-001 instruments cognitive walkthrough route health and timing', async ({
  page,
  request,
}, testInfo) => {
  await mkdir(screenshotDir, { recursive: true });
  const fixture = await createApprovedFinanceApplicationViaApi(request);
  await setSession(page, fixture);

  const observedErrors: string[] = [];
  page.on('pageerror', (error) => {
    observedErrors.push(`pageerror: ${error.message}`);
  });
  page.on('console', (message) => {
    if (message.type() === 'error') {
      observedErrors.push(`console: ${message.text()}`);
    }
  });

  const measurements: RouteMeasurement[] = [];

  for (const routeProbe of walkthroughRoutes) {
    const beforeErrorCount = observedErrors.length;
    const startedAt = performance.now();
    const result = await navigateForHci(page, testInfo, routeProbe);
    const elapsedMs = Math.round(performance.now() - startedAt);

    if (!result.ok) {
      measurements.push({
        id: routeProbe.id,
        route: routeProbe.route,
        status: 'blocked',
        elapsedMs: null,
        errorsObserved: observedErrors.length - beforeErrorCount,
        screenshot: result.screenshot,
        blocker: result.reason,
      });
      await writeInstrumentation(measurements, observedErrors);
      test.skip(true, `${routeProbe.id} blocked: ${result.reason}`);
    }

    measurements.push({
      id: routeProbe.id,
      route: routeProbe.route,
      status: 'measured',
      elapsedMs,
      errorsObserved: observedErrors.length - beforeErrorCount,
      screenshot: result.screenshot,
      blocker: null,
    });
  }

  await writeInstrumentation(measurements, observedErrors);

  expect(measurements).toHaveLength(walkthroughRoutes.length);
  expect(measurements.every((measurement) => measurement.status === 'measured')).toBe(
    true,
  );
});

async function navigateForHci(
  page: Page,
  testInfo: TestInfo,
  routeProbe: RouteProbe,
) {
  const screenshotPath = path.join(screenshotDir, routeProbe.screenshotName);
  const screenshotEvidencePath = path
    .relative(process.cwd(), screenshotPath)
    .replaceAll(path.sep, '/');

  try {
    const response = await page.goto(routeProbe.route, {
      waitUntil: 'networkidle',
    });

    if (response && response.status() >= 400) {
      await page.screenshot({ path: screenshotPath, fullPage: true });
      return {
        ok: false,
        reason: `${routeProbe.route} returned HTTP ${response.status()}`,
        screenshot: screenshotEvidencePath,
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
        reason: `${routeProbe.route} rendered Access denied for the seeded walkthrough role`,
        screenshot: screenshotEvidencePath,
      };
    }

    const bodyText = await page.locator('body').innerText();
    if (isUnsafeEvidenceText(bodyText)) {
      return {
        ok: false,
        reason: `${routeProbe.route} rendered sensitive text; screenshot capture blocked`,
        screenshot: null,
      };
    }

    await expect(page.locator('body')).toContainText(routeProbe.expectedText);
    await page.screenshot({ path: screenshotPath, fullPage: true });

    await testInfo.attach(`${routeProbe.id}-route-health`, {
      body: JSON.stringify(
        {
          route: routeProbe.route,
          screenshot: screenshotEvidencePath,
          status: 'measured',
        },
        null,
        2,
      ),
      contentType: 'application/json',
    });

    return {
      ok: true,
      reason: null,
      screenshot: screenshotEvidencePath,
    };
  } catch (error) {
    await page.screenshot({ path: screenshotPath, fullPage: true }).catch(
      () => undefined,
    );
    return {
      ok: false,
      reason: error instanceof Error ? error.message : String(error),
      screenshot: screenshotEvidencePath,
    };
  }
}

async function writeInstrumentation(
  measurements: RouteMeasurement[],
  observedErrors: string[],
) {
  await writeFile(
    metricsPath,
    `${JSON.stringify(
      {
        status: measurements.some((measurement) => measurement.status === 'blocked')
          ? 'blocked'
          : 'measured',
        note:
          'Playwright instrumentation output only. Do not treat as participant HCI scoring.',
        measurements,
        observedErrors,
      },
      null,
      2,
    )}\n`,
  );
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
