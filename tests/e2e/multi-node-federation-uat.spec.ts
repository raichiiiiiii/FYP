import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

import {
  defaultSeedPassword,
  localFederationNodeDefinitions,
} from '../uat/local-node-catalog.mjs';

type LocalFederationNode = {
  key: string;
  legalName: string;
  type: string;
  category: 'business' | 'finance';
  webUrl: string;
  apiUrl: string;
  admin: {
    email: string;
    roleCode: string;
  };
};

type AuthSession = {
  userId: string;
  email: string;
  displayName: string;
  profileImageUrl?: string | null;
  organizationId: string;
  organization: {
    id: string;
    legalName: string;
    deploymentMode: string;
  };
  roleCodes: string[];
  permissionCodes: string[];
  workspaceScopes: string[];
  expiresAt: string;
  authMode: string;
  devAuthEnabled: boolean;
  passwordAuthEnabled: boolean;
  oidcEnabled: boolean;
};

type NodeChannel = {
  channelName: string;
  channelType: string;
  status: string;
  memberships: Array<{
    nodeKey: string;
    membershipStatus: string;
  }>;
};

type NodeCanvas = {
  nodes: Array<{
    id: string;
    type: string;
    label: string;
    status: string;
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    type: string;
    label: string;
  }>;
};

const multiNodeUatEnabled = process.env.MEPN_MULTI_NODE_UAT === 'true';
const nodes = localFederationNodeDefinitions as LocalFederationNode[];
const screenshotDir = path.resolve(
  'docs/evidence/uat/screenshots/multi-node',
);
const forbiddenRenderedPatterns = [
  /Internal Server Error/i,
  /Application Error/i,
  /Unhandled Runtime Error/i,
  /\b500\b/,
  /Stack trace|(?:^|\n)\s*at\s+[\w.$<>\[\]-]+\s*\(/i,
  /BEGIN PRIVATE KEY/i,
  /BEGIN CERTIFICATE/i,
  /FABRIC_PRIVATE_KEY_PEM/i,
  /AZURE_VM_SSH_KEY/i,
  /password=/i,
  /token=/i,
];

test.describe.serial('local multi-node federation UAT', () => {
  test.skip(
    !multiNodeUatEnabled,
    'Set MEPN_MULTI_NODE_UAT=true and run start.ps1 without -SkipUat to exercise the 10-node local stack.',
  );

  test.beforeAll(async () => {
    await mkdir(screenshotDir, { recursive: true });
  });

  test('all node APIs and login pages are reachable', async ({
    page,
    request,
  }) => {
    test.setTimeout(180_000);

    for (const node of nodes) {
      const health = await request.get(`${node.apiUrl}/api/v1/health`);
      expect(health.ok(), `${node.key} API health`).toBe(true);

      const authConfig = await request.get(`${node.apiUrl}/api/v1/auth/config`);
      expect(authConfig.ok(), `${node.key} auth config`).toBe(true);
      await expect(authConfig.json()).resolves.toEqual(
        expect.objectContaining({
          passwordAuthEnabled: true,
          devAuthEnabled: false,
        }),
      );

      await page.goto(`${node.webUrl}/login`, {
        waitUntil: 'domcontentloaded',
      });
      await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
      await expect(page.getByLabel('Password')).toBeVisible();
      await assertNoForbiddenText(page, `${node.key} login`);
      await page.screenshot({
        path: path.join(screenshotDir, `login-${node.key}.png`),
        fullPage: true,
      });
    }
  });

  test('admin password login works on every node and screenshots are captured', async ({
    page,
  }) => {
    test.setTimeout(240_000);

    for (const node of nodes) {
      await loginThroughUi(page, node, node.admin.email);
      await expect(page).toHaveURL(/\/dashboard$/);
      await expect(page.getByText(node.legalName)).toBeVisible();
      await assertNoForbiddenText(page, `${node.key} dashboard`);
      await page.screenshot({
        path: path.join(screenshotDir, `dashboard-${node.key}.png`),
        fullPage: true,
      });
    }
  });

  test('cross-node user and wrong password cannot authenticate', async ({
    request,
  }) => {
    const amanah = nodeByKey('amanah-retail');
    const barakah = nodeByKey('barakah-supplies');

    const crossNode = await request.post(
      `${amanah.apiUrl}/api/v1/auth/password-login`,
      {
        data: {
          email: barakah.admin.email,
          password: defaultSeedPassword,
        },
      },
    );
    expect(crossNode.ok()).toBe(false);
    expect([401, 404]).toContain(crossNode.status());

    const wrongPassword = await request.post(
      `${amanah.apiUrl}/api/v1/auth/password-login`,
      {
        data: {
          email: amanah.admin.email,
          password: 'wrong-password',
        },
      },
    );
    expect(wrongPassword.ok()).toBe(false);
    expect(wrongPassword.status()).toBe(401);
  });

  test('preconfigured simulated channel metadata is synchronized', async ({
    request,
  }) => {
    const amanah = nodeByKey('amanah-retail');
    const barakah = nodeByKey('barakah-supplies');
    const mabrur = nodeByKey('mabrur-finance');
    const amanahSession = await loginViaApi(request, amanah);
    const barakahSession = await loginViaApi(request, barakah);
    const mabrurSession = await loginViaApi(request, mabrur);

    const amanahChannels = await listChannels(request, amanah, amanahSession);
    const tender = requireChannel(amanahChannels, 'tender-market-channel');
    expect(tender.status).toBe('simulated_active');
    expect(tender.memberships).toHaveLength(7);
    expect(tender.memberships.every(isJoinedMembership)).toBe(true);

    const award = requireChannel(
      amanahChannels,
      'award-amanah-barakah-channel',
    );
    expect(award.status).toBe('simulated_active');
    expect(award.memberships.map((membership) => membership.nodeKey).sort()).toEqual(
      ['amanah-retail', 'barakah-supplies'],
    );

    const barakahChannels = await listChannels(request, barakah, barakahSession);
    expect(requireChannel(barakahChannels, 'award-amanah-barakah-channel').status).toBe(
      'simulated_active',
    );
    expect(requireChannel(barakahChannels, 'finance-mabrur-barakah-channel').status).toBe(
      'simulated_active',
    );

    const mabrurChannels = await listChannels(request, mabrur, mabrurSession);
    const financeData = requireChannel(mabrurChannels, 'finance-data-channel');
    expect(financeData.status).toBe('simulated_active');
    expect(financeData.memberships.map((membership) => membership.nodeKey).sort()).toEqual(
      ['aman-capital', 'mabrur-finance', 'safwa-growth'],
    );
  });

  test('node-federation canvas API exposes representative buyer and finance channels', async ({
    request,
  }) => {
    const amanah = nodeByKey('amanah-retail');
    const mabrur = nodeByKey('mabrur-finance');
    const amanahCanvas = await getCanvas(
      request,
      amanah,
      await loginViaApi(request, amanah),
    );
    const mabrurCanvas = await getCanvas(
      request,
      mabrur,
      await loginViaApi(request, mabrur),
    );

    expect(amanahCanvas.nodes.map((node) => node.label)).toEqual(
      expect.arrayContaining([
        'Amanah Retail Sdn Bhd',
        'tender-market-channel',
        'award-amanah-barakah-channel',
      ]),
    );
    expect(amanahCanvas.edges.some((edge) => edge.type === 'private_channel')).toBe(
      true,
    );
    expect(mabrurCanvas.nodes.map((node) => node.label)).toContain(
      'finance-data-channel',
    );
    expect(
      mabrurCanvas.edges.some((edge) => edge.type === 'shares_finance_data_on'),
    ).toBe(true);
  });

  test('representative rendered routes show local federation evidence', async ({
    page,
    request,
  }) => {
    test.setTimeout(180_000);

    await openAuthenticatedRoute({
      page,
      request,
      node: nodeByKey('amanah-retail'),
      route: '/graph/projects',
      expectedText: /Self-hosted nodes and simulated channels/i,
      screenshotName: 'canvas-amanah-retail.png',
    });
    await expect(page.getByText('tender-market-channel')).toBeVisible();

    await openAuthenticatedRoute({
      page,
      request,
      node: nodeByKey('mabrur-finance'),
      route: '/graph/projects',
      expectedText: /Self-hosted nodes and simulated channels/i,
      screenshotName: 'canvas-mabrur-finance.png',
    });
    await expect(page.getByText('finance-data-channel')).toBeVisible();

    await openAuthenticatedRoute({
      page,
      request,
      node: nodeByKey('amanah-retail'),
      route: '/admin/users',
      expectedText: /Sidebar access|Users|Roles/i,
      screenshotName: 'admin-users-sidebar-amanah-retail.png',
    });

    await openAuthenticatedRoute({
      page,
      request,
      node: nodeByKey('amanah-retail'),
      route: '/account/profile',
      expectedText: /Password|Profile|Local/i,
      screenshotName: 'profile-password-amanah-retail.png',
    });
  });
});

async function loginThroughUi(
  page: Page,
  node: LocalFederationNode,
  email: string,
) {
  await page.goto(`${node.webUrl}/login`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('textbox', { name: /^Email\b/ }).fill(email);
  await page.getByLabel('Password').fill(defaultSeedPassword);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(
    () => undefined,
  );
}

async function openAuthenticatedRoute(input: {
  page: Page;
  request: APIRequestContext;
  node: LocalFederationNode;
  route: string;
  expectedText: RegExp;
  screenshotName: string;
}) {
  const session = await loginViaApi(input.request, input.node);

  await setSessionForNode(input.page, input.node, session);
  await input.page.goto(`${input.node.webUrl}${input.route}`, {
    waitUntil: 'domcontentloaded',
  });
  await input.page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(
    () => undefined,
  );
  await expect(input.page.locator('body')).toContainText(input.expectedText);
  await assertNoForbiddenText(
    input.page,
    `${input.node.key} ${input.route}`,
  );
  await input.page.screenshot({
    path: path.join(screenshotDir, input.screenshotName),
    fullPage: true,
  });
}

async function loginViaApi(
  request: APIRequestContext,
  node: LocalFederationNode,
): Promise<AuthSession> {
  const response = await request.post(`${node.apiUrl}/api/v1/auth/password-login`, {
    data: {
      email: node.admin.email,
      password: defaultSeedPassword,
    },
  });

  expect(response.ok(), `${node.key} API password login`).toBe(true);

  return (await response.json()) as AuthSession;
}

async function listChannels(
  request: APIRequestContext,
  node: LocalFederationNode,
  session: AuthSession,
): Promise<NodeChannel[]> {
  const response = await request.get(
    `${node.apiUrl}/api/v1/node-federation/channels?${scopedParams(
      node,
      session,
    )}`,
  );
  expect(response.ok(), `${node.key} node-federation channels`).toBe(true);

  return (await response.json()) as NodeChannel[];
}

async function getCanvas(
  request: APIRequestContext,
  node: LocalFederationNode,
  session: AuthSession,
): Promise<NodeCanvas> {
  const response = await request.get(
    `${node.apiUrl}/api/v1/node-federation/canvas?${scopedParams(
      node,
      session,
    )}`,
  );
  expect(response.ok(), `${node.key} node-federation canvas`).toBe(true);

  return (await response.json()) as NodeCanvas;
}

async function setSessionForNode(
  page: Page,
  node: LocalFederationNode,
  session: AuthSession,
) {
  await page.goto(`${node.webUrl}/login`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(
    (nextSession) => {
      window.localStorage.setItem(
        'mepn.auth.session',
        JSON.stringify(nextSession),
      );
    },
    session,
  );
}

function scopedParams(node: LocalFederationNode, session: AuthSession) {
  return new URLSearchParams({
    organizationId: session.organizationId,
    actorUserId: session.userId,
    localNodeKey: node.key,
  }).toString();
}

async function assertNoForbiddenText(page: Page, label: string) {
  const bodyText = await page.locator('body').innerText();
  const matches = forbiddenRenderedPatterns.filter((pattern) =>
    pattern.test(bodyText),
  );

  expect(matches, `${label} forbidden text`).toEqual([]);
}

function nodeByKey(key: string) {
  const node = nodes.find((candidate) => candidate.key === key);

  if (!node) {
    throw new Error(`Unknown local federation node ${key}`);
  }

  return node;
}

function requireChannel(channels: NodeChannel[], channelName: string) {
  const channel = channels.find((candidate) => {
    return candidate.channelName === channelName;
  });

  if (!channel) {
    throw new Error(`Channel ${channelName} was not found`);
  }

  return channel;
}

function isJoinedMembership(membership: NodeChannel['memberships'][number]) {
  return membership.membershipStatus === 'simulated_joined';
}
