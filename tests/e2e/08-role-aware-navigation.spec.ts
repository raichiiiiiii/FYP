import { expect, test } from '@playwright/test';
import {
  createOrganizationViaApi,
  createUserSessionWithRole,
  resetDatabase,
  setSession,
} from './helpers';

test.beforeEach(async () => {
  await resetDatabase();
});

test('SRS-UI-RBAC-001 admin sees organization, identity, procurement, evidence, and audit menus', async ({
  page,
  request,
}) => {
  const adminSession = await createOrganizationViaApi(request, 'E2E RBAC Admin');
  await setSession(page, adminSession);

  await page.goto('/dashboard');

  const nav = page.getByRole('navigation', { name: 'Main navigation' });
  await expect(nav.getByRole('link', { name: 'Organization' })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'Users' })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'Roles' })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'Requisitions' })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'Evidence Packs' })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'Audit Events' })).toBeVisible();
});

test('SRS-UI-RBAC-002 procurement officer sees procurement menus and is denied admin screens', async ({
  page,
  request,
}) => {
  const adminSession = await createOrganizationViaApi(request, 'E2E RBAC Proc');
  const procurementSession = await createUserSessionWithRole(
    request,
    adminSession,
    'PROCUREMENT_OFFICER',
  );
  await setSession(page, procurementSession);

  await page.goto('/dashboard');

  const nav = page.getByRole('navigation', { name: 'Main navigation' });
  await expect(nav.getByRole('link', { name: 'Suppliers' })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'Projects' })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'Requisitions' })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'RFQs' })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'Users' })).toHaveCount(0);
  await expect(
    nav.getByRole('link', { name: 'Finance Opportunities' }),
  ).toHaveCount(0);

  await page.goto('/admin/users');
  await expect(page.getByRole('heading', { name: 'Access denied' })).toBeVisible();
});

test('SRS-UI-RBAC-003 financier reviewer sees finance review menus and is denied procurement screens', async ({
  page,
  request,
}) => {
  const adminSession = await createOrganizationViaApi(
    request,
    'E2E RBAC Finance',
  );
  const financierSession = await createUserSessionWithRole(
    request,
    adminSession,
    'FINANCIER_USER',
  );
  await setSession(page, financierSession);

  await page.goto('/dashboard');

  const nav = page.getByRole('navigation', { name: 'Main navigation' });
  await expect(
    nav.getByRole('link', { name: 'Finance Opportunities' }),
  ).toBeVisible();
  await expect(nav.getByRole('link', { name: 'Applications' })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'Evidence Packs' })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'Audit Timeline' })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'Suppliers' })).toHaveCount(0);

  await page.goto('/procurement/suppliers');
  await expect(page.getByRole('heading', { name: 'Access denied' })).toBeVisible();
});

test('SRS-UI-RBAC-004 auditor sees evidence, audit, and closure menus and is denied write screens', async ({
  page,
  request,
}) => {
  const adminSession = await createOrganizationViaApi(
    request,
    'E2E RBAC Auditor',
  );
  const auditorSession = await createUserSessionWithRole(
    request,
    adminSession,
    'AUDITOR',
  );
  await setSession(page, auditorSession);

  await page.goto('/dashboard');

  const nav = page.getByRole('navigation', { name: 'Main navigation' });
  await expect(nav.getByRole('link', { name: 'Evidence Packs' })).toBeVisible();
  await expect(
    nav.getByRole('link', { name: 'Hash Verification' }),
  ).toBeVisible();
  await expect(nav.getByRole('link', { name: 'Audit Events' })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'Closure Packs' })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'Users' })).toHaveCount(0);
  await expect(nav.getByRole('link', { name: 'Suppliers' })).toHaveCount(0);

  await page.goto('/procurement/projects');
  await expect(page.getByRole('heading', { name: 'Access denied' })).toBeVisible();
});
