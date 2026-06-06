import { expect, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { createOrganizationViaApi, resetDatabase, setSession } from './helpers';

type RouteHealthCase = {
  route: string;
  label: string;
  screenshot: string;
};

type Diagnostic = {
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
);

const routeHealthCases: RouteHealthCase[] = [
  {
    route: '/dashboard',
    label: 'Dashboard',
    screenshot: 'before-dashboard-error.png',
  },
  {
    route: '/finance/opportunities',
    label: 'Finance opportunities',
    screenshot: 'before-finance-opportunities-error.png',
  },
  {
    route: '/finance/applications',
    label: 'Finance applications',
    screenshot: 'before-finance-applications-error.png',
  },
  {
    route: '/finance/contracts',
    label: 'Finance contracts',
    screenshot: 'before-finance-contracts-error.png',
  },
  {
    route: '/graph/projects',
    label: 'Graph projects',
    screenshot: 'before-graph-projects-error.png',
  },
  {
    route: '/operations',
    label: 'Operations',
    screenshot: 'before-operations-error.png',
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
    pattern: /\b500\b/i,
  },
  {
    label: 'stack trace',
    pattern: /Stack trace|(?:^|\n)\s*at\s+[\w.$<>\[\]]+\s*\(/i,
  },
] as const;

test.beforeEach(async () => {
  await resetDatabase();
});

for (const routeCase of routeHealthCases) {
  test(`UI-ROUTE-HEALTH ${routeCase.label} does not render runtime/server error chrome`, async ({
    page,
    request,
  }) => {
    const diagnostics: Diagnostic[] = [];
    const session = await createOrganizationViaApi(
      request,
      `Route Health ${routeCase.label}`,
    );

    page.on('console', (message) => {
      if (!['error', 'warning'].includes(message.type())) {
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

    await setSession(page, session);
    const response = await page.goto(routeCase.route, {
      waitUntil: 'domcontentloaded',
    });

    await expect(page.locator('body')).toBeVisible();
    await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {
      diagnostics.push({
        type: 'requestfailed',
        message: 'networkidle timeout after route navigation',
        url: routeCase.route,
      });
    });

    const bodyText = await page.locator('body').innerText();
    const renderedFindings = forbiddenRenderedPatterns
      .filter(({ pattern }) => pattern.test(bodyText))
      .map(({ label }) => label);
    const runtimeFindings = diagnostics.filter(
      (diagnostic) =>
        diagnostic.type === 'pageerror' ||
        diagnostic.type === 'requestfailed' ||
        diagnostic.type === 'server-response' ||
        (diagnostic.type === 'console' && diagnostic.level === 'error'),
    );
    const findings = [
      ...(response && response.status() >= 500
        ? [`document response ${response.status()}`]
        : []),
      ...(bodyText.trim().length === 0 ? ['blank body'] : []),
      ...renderedFindings,
      ...runtimeFindings.map(describeDiagnostic),
    ];

    await test.info().attach('sanitized-route-diagnostics', {
      body: JSON.stringify(
        {
          route: routeCase.route,
          documentStatus: response?.status() ?? null,
          diagnostics,
          renderedFindings,
        },
        null,
        2,
      ),
      contentType: 'application/json',
    });

    if (findings.length > 0) {
      await mkdir(screenshotDir, { recursive: true });
      await page.screenshot({
        path: path.join(screenshotDir, routeCase.screenshot),
        fullPage: true,
      });
    }

    expect(findings, healthMessage(routeCase, findings, diagnostics)).toEqual([]);
  });
}

function describeDiagnostic(diagnostic: Diagnostic) {
  const status = diagnostic.status ? ` ${diagnostic.status}` : '';
  const level = diagnostic.level ? ` ${diagnostic.level}` : '';
  const url = diagnostic.url ? ` ${diagnostic.url}` : '';

  return `${diagnostic.type}${level}${status}${url}: ${diagnostic.message}`;
}

function healthMessage(
  routeCase: RouteHealthCase,
  findings: string[],
  diagnostics: Diagnostic[],
) {
  return [
    `${routeCase.route} is unhealthy.`,
    `Screenshot path: ${path.join(screenshotDir, routeCase.screenshot)}`,
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
