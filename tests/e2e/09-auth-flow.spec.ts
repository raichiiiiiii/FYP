import { expect, test } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import {
  apiPost,
  createOrganizationViaApi,
  E2E_DATABASE_URL,
  resetDatabase,
} from './helpers';

test.beforeEach(async () => {
  await resetDatabase();
});

test('SRS-AUTH-001 local dev login creates an authenticated application session', async ({
  page,
  request,
}) => {
  const session = await createOrganizationViaApi(request, 'E2E Auth SME');

  await page.goto('/login');
  const emailField = page.getByRole('textbox', { name: /^Email\b/ });
  await expect(emailField).toBeVisible();
  await page.screenshot({
    path: 'docs/evidence/uat/auth-login-dev-mode.png',
    fullPage: true,
  });
  await emailField.fill(session.email);
  await page.getByLabel('Organization ID').fill(session.organizationId);
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText(session.legalName)).toBeVisible();

  const storedSession = await page.evaluate(() =>
    JSON.parse(window.localStorage.getItem('mepn.auth.session') || 'null') as {
      userId?: string;
      organizationId?: string;
      roleCodes?: string[];
      permissionCodes?: string[];
      expiresAt?: string;
    } | null,
  );

  expect(storedSession?.userId).toBe(session.actorUserId);
  expect(storedSession?.organizationId).toBe(session.organizationId);
  expect(storedSession?.roleCodes).toContain('ORG_ADMIN');
  expect(storedSession?.permissionCodes).toContain('users:create');
  expect(storedSession?.expiresAt).toBeTruthy();
});

test('SRS-AUTH-003 seeded local password login creates an authenticated application session', async ({
  page,
}) => {
  seedUatDatabase();

  await page.goto('/login');
  const emailField = page.getByRole('textbox', { name: /^Email\b/ });
  const passwordField = page.getByLabel('Password');
  await expect(emailField).toBeVisible();
  await expect(passwordField).toBeVisible();

  await emailField.fill('buyer.admin@amanah.local');
  await passwordField.fill('password');
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText('Amanah Retail Sdn Bhd')).toBeVisible();
  await page.screenshot({
    path: 'docs/evidence/uat/auth-login-seeded-password.png',
    fullPage: true,
  });

  const storedSession = await page.evaluate(() =>
    JSON.parse(window.localStorage.getItem('mepn.auth.session') || 'null') as {
      email?: string;
      authMode?: string;
      roleCodes?: string[];
      permissionCodes?: string[];
    } | null,
  );

  expect(storedSession?.email).toBe('buyer.admin@amanah.local');
  expect(storedSession?.authMode).toBe('password');
  expect(storedSession?.roleCodes).toContain('ORG_ADMIN');
  expect(storedSession?.permissionCodes).toContain('users:create');
});

test('SRS-AUTH-002 invitation acceptance creates membership and local UAT session', async ({
  page,
  request,
}) => {
  const session = await createOrganizationViaApi(
    request,
    'E2E Invite Auth SME',
  );

  const invitationBody = await apiPost<{
    token: string;
    invitation: {
      email: string;
    };
  }>(request, '/auth/invitations', {
      organizationId: session.organizationId,
      actorUserId: session.actorUserId,
      email: `invite-${Date.now()}@example.test`,
      roleCode: 'ORG_ADMIN',
  });

  await page.goto(
    `/auth/invitations/accept?token=${encodeURIComponent(invitationBody.token)}`,
  );
  await expect(
    page.getByRole('heading', { name: 'Accept MEPN access' }),
  ).toBeVisible();
  await expect(page.getByText(invitationBody.invitation.email)).toBeVisible();
  await page.screenshot({
    path: 'docs/evidence/uat/auth-invitation-acceptance.png',
    fullPage: true,
  });

  await page.getByLabel('Display name').fill('Invite Accepted');
  await page.getByRole('button', { name: 'Accept invitation' }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText(session.legalName)).toBeVisible();
});

function seedUatDatabase() {
  execFileSync(process.execPath, ['tests/uat/seed-uat-demo.mjs'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      DATABASE_URL: E2E_DATABASE_URL,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}
