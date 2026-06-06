import { expect, test } from '@playwright/test';
import { apiPost, createOrganizationViaApi, resetDatabase } from './helpers';

test.beforeEach(async () => {
  await resetDatabase();
});

test('SRS-AUTH-001 local dev login creates an authenticated application session', async ({
  page,
  request,
}) => {
  const session = await createOrganizationViaApi(request, 'E2E Auth SME');

  await page.goto('/login');
  await expect(page.getByLabel('Email')).toBeVisible();
  await page.screenshot({
    path: 'docs/evidence/uat/auth-login-dev-mode.png',
    fullPage: true,
  });
  await page.getByLabel('Email').fill(session.email);
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
