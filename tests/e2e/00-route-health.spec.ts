import { expect, test, type ConsoleMessage, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

import {
  createOrganizationViaApi,
  resetDatabase,
  setSession,
} from './helpers';

type CriticalRoute = {
  id: string;
  route: string;
  label: string;
  screenshotName: string;
};

type RouteDiagnostic = {
  type: 'console' | 'pageerror' | 'requestfailed' | 'server-response';
  level?: string;
  message: string;
  status?: number;
  url?: string;
};

const screenshotDir = path.join(
  'docs',
  'evidence',
  'ux',
  'screenshots',
  'route-health',
);

const criticalRoutes: CriticalRoute[] = [
  {
    id: 'RH-001',
    route: '/dashboard',
    label: 'Dashboard',
    screenshotName: 'dashboard-failure.png',
  },
  {
    id: 'RH-002',
    route: '/finance/opportunities',
    label: 'Finance opportunities',
    screenshotName: 'finance-opportunities-failure.png',
  },
  {
    id: 'RH-003',
    route: '/finance/applications',
    label: 'Finance applications',
    screenshotName: 'finance-applications-failure.png',
  },
  {
    id: 'RH-004',
    route: '/finance/contracts',
    label: 'Finance contracts',
    screenshotName: 'finance-contracts-failure.png',
  },
  {
    id: 'RH-005',
    route: '/graph/projects',
    label: 'Graph projects',
    screenshotName: 'graph-projects-failure.png',
  },
  {
    id: 'RH-006',
    route: '/operations',
    label: 'Operations',
    screenshotName: 'operations-failure.png',
  },
];

const forbiddenRenderedPatterns = [
  {
    label: 'Internal Server Error',
    pattern: /Internal Server Error/i,
  },
  {
    label: 'Application Error',
    pattern: /Application Error/i,
  },
  {
    label: 'Unhandled Runtime Error',
    pattern: /Unhandled Runtime Error/i,
  },
  {
    label: '500',
    pattern: /\b500\b/,
  },
  {
    label: 'stack trace text',
    pattern: /Stack trace|(?:^|\n)\s*at\s+[\w.$<>\[\]-]+\s*\(/i,
  },
] as const;

test.describe('UI route health baseline', () => {
  test.beforeEach(async () => {
    await resetDatabase();
  });

  for (const target of criticalRoutes) {
    test(`${target.id} ${target.label} does not render runtime/server error text`, async ({
      page,
      request,
    }, testInfo) => {
      const diagnostics = collectDiagnostics(page);
      const session = await createOrganizationViaApi(
        request,
        `Route Health ${target.label}`,
      );

      await setSession(page, session);

      const response = await page.goto(target.route, {
        waitUntil: 'domcontentloaded',
      });

      await expect(page.locator('body')).toBeVisible();

      await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(
        () => {
          diagnostics.push({
            type: 'requestfailed',
            message: 'networkidle timeout after route navigation',
            url: target.route,
          });
        },
      );

      const bodyText = await page.locator('body').innerText();
      const renderedFindings = forbiddenRenderedPatterns
        .filter(({ pattern }) => pattern.test(bodyText))
        .map(({ label }) => label);
      const routeFindings = [
        ...(response && response.status() >= 500
          ? [`document response ${response.status()}`]
          : []),
        ...(bodyText.trim().length === 0 ? ['blank rendered body'] : []),
        ...renderedFindings,
        ...diagnostics
          .filter(isFailingDiagnostic)
          .map(describeDiagnostic),
      ];
      const screenshotPath = path.join(screenshotDir, target.screenshotName);

      await testInfo.attach('route-health-diagnostics', {
        body: JSON.stringify(
          {
            route: target.route,
            documentStatus: response?.status() ?? null,
            screenshotPath,
            renderedFindings,
            diagnostics,
          },
          null,
          2,
        ),
        contentType: 'application/json',
      });

      if (routeFindings.length > 0) {
        await mkdir(screenshotDir, { recursive: true });
        await page.screenshot({ path: screenshotPath, fullPage: true });
      }

      expect(
        routeFindings,
        healthMessage(target, screenshotPath, routeFindings, diagnostics),
      ).toEqual([]);
    });
  }
});

function collectDiagnostics(page: Page) {
  const diagnostics: RouteDiagnostic[] = [];

  page.on('console', (message) => {
    if (!isRecordedConsoleMessage(message)) {
      return;
    }

    diagnostics.push({
      type: 'console',
      level: message.type(),
      message: sanitizeDiagnostic(message.text()),
    });
  });

  page.on('pageerror', (error) => {
    diagnostics.push({
      type: 'pageerror',
      message: sanitizeDiagnostic(error.stack ?? error.message),
    });
  });

  page.on('requestfailed', (failedRequest) => {
    diagnostics.push({
      type: 'requestfailed',
      message: sanitizeDiagnostic(
        failedRequest.failure()?.errorText ?? 'request failed',
      ),
      url: sanitizeUrl(failedRequest.url()),
    });
  });

  page.on('response', (response) => {
    if (response.status() < 500) {
      return;
    }

    diagnostics.push({
      type: 'server-response',
      status: response.status(),
      message: sanitizeDiagnostic(response.statusText()),
      url: sanitizeUrl(response.url()),
    });
  });

  return diagnostics;
}

function isRecordedConsoleMessage(message: ConsoleMessage) {
  return ['error', 'warning'].includes(message.type());
}

function isFailingDiagnostic(diagnostic: RouteDiagnostic) {
  if (
    diagnostic.type === 'pageerror' ||
    diagnostic.type === 'requestfailed' ||
    diagnostic.type === 'server-response'
  ) {
    return true;
  }

  return (
    diagnostic.type === 'console' &&
    diagnostic.level === 'error' &&
    forbiddenRenderedPatterns.some(({ pattern }) =>
      pattern.test(diagnostic.message),
    )
  );
}

function describeDiagnostic(diagnostic: RouteDiagnostic) {
  const status = diagnostic.status ? ` ${diagnostic.status}` : '';
  const level = diagnostic.level ? ` ${diagnostic.level}` : '';
  const url = diagnostic.url ? ` ${diagnostic.url}` : '';

  return `${diagnostic.type}${level}${status}${url}: ${diagnostic.message}`;
}

function healthMessage(
  target: CriticalRoute,
  screenshotPath: string,
  findings: string[],
  diagnostics: RouteDiagnostic[],
) {
  return [
    `${target.route} is unhealthy under the route-health baseline.`,
    `Screenshot path: ${screenshotPath}`,
    `Findings: ${findings.join('; ')}`,
    `Diagnostics: ${JSON.stringify(diagnostics, null, 2)}`,
  ].join('\n');
}

function sanitizeUrl(value: string) {
  try {
    const parsed = new URL(value);

    if (parsed.search) {
      parsed.search = '?<redacted>';
    }

    return parsed.toString();
  } catch {
    return sanitizeDiagnostic(value);
  }
}

function sanitizeDiagnostic(value: string) {
  return value
    .replace(
      /(authorization|token|password|secret|api[_-]?key|cookie)=([^&\s]+)/gi,
      '$1=<redacted>',
    )
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer <redacted>')
    .replace(/sk-[A-Za-z0-9_-]+/gi, 'sk-<redacted>')
    .slice(0, 1_000);
}
