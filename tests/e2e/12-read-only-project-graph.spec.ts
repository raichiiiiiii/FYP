import { randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { Client } from 'pg';
import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import {
  apiPost,
  createApprovedFinanceApplicationViaApi,
  createUserSessionWithRole,
  E2E_DATABASE_URL,
  resetDatabase,
  setSession,
  type E2ESession,
} from './helpers';

test.beforeEach(async () => {
  await resetDatabase();
});

test('SRS-GRAPH-001 read-only project graph opens source records and hides finance nodes by role', async ({
  page,
  request,
}) => {
  const fixture = await createApprovedFinanceApplicationViaApi(request);
  const seededAnchors = await seedGraphAnchorOverlay(request, fixture);
  const procurementOfficer = await createUserSessionWithRole(
    request,
    fixture,
    'PROCUREMENT_OFFICER',
  );

  await setSession(page, fixture);
  await page.goto('/graph/projects');
  await expect(
    page.getByRole('heading', { name: 'Project network canvas' }),
  ).toBeVisible();
  await selectGraphProject(page, String(fixture.project.id));
  await expect(
    page.getByRole('link', { name: new RegExp(String(fixture.project.name)) }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', {
      name: new RegExp(String(fixture.opportunity.title)),
    }),
  ).toBeVisible();
  await expect(page.getByTestId('graph-node-hash_record')).toHaveCount(2);
  await expect(page.getByTestId('graph-node-anchor')).toHaveCount(2);
  await page
    .getByTestId('graph-node-anchor')
    .filter({ hasText: seededAnchors.procurementTx })
    .focus();
  await expect(page.getByTestId('graph-inspector')).toContainText(
    seededAnchors.procurementTx,
  );
  await mkdir(path.resolve('docs/evidence/uat'), { recursive: true });
  await page.screenshot({
    path: path.resolve(
      'docs/evidence/uat/graph-anchor-overlay-auditor.png',
    ),
    fullPage: true,
  });

  await page
    .getByRole('link', { name: new RegExp(String(fixture.purchaseOrder.poNumber)) })
    .click();
  await expect(page).toHaveURL(
    new RegExp(`/procurement/purchase-orders/${fixture.purchaseOrder.id}`),
  );

  await setSession(page, procurementOfficer);
  await page.goto('/graph/projects');
  await selectGraphProject(page, String(fixture.project.id));
  await expect(
    page.locator('.graph-summary article').filter({ hasText: 'Finance layer' }),
  ).toContainText('Hidden');
  await expect(
    page
      .getByTestId('graph-node-document')
      .filter({ hasText: String(fixture.purchaseOrder.poNumber) }),
  ).toBeVisible();
  await expect(
    page.getByTestId('graph-node-anchor').filter({
      hasText: seededAnchors.procurementTx,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', {
      name: new RegExp(String(fixture.opportunity.title)),
    }),
  ).toHaveCount(0);
  await expect(page.getByText(seededAnchors.financeTx)).toHaveCount(0);
  await page.screenshot({
    path: path.resolve(
      'docs/evidence/uat/graph-anchor-overlay-procurement-filtered.png',
    ),
    fullPage: true,
  });
});

async function selectGraphProject(page: Page, projectId: string) {
  await page
    .locator('.graph-toolbar label')
    .filter({ hasText: 'Project' })
    .locator('select')
    .selectOption(projectId);
}

async function seedGraphAnchorOverlay(
  request: APIRequestContext,
  fixture: {
    organizationId: string;
    actorUserId: string;
    purchaseOrder: { id: string };
    application: { id: string };
  },
) {
  const procurementHash = await createHashRecordForGraph(
    request,
    fixture,
    'PurchaseOrder',
    fixture.purchaseOrder.id,
  );
  const financeHash = await createHashRecordForGraph(
    request,
    fixture,
    'MudarabahApplication',
    fixture.application.id,
  );
  const procurementTx = `tx-graph-procurement-${Date.now()}`;
  const financeTx = `tx-graph-finance-${Date.now()}`;
  const client = new Client({ connectionString: E2E_DATABASE_URL });

  await client.connect();

  try {
    await insertAnchor(client, fixture, procurementHash.canonicalHash, procurementTx);
    await insertAnchor(client, fixture, financeHash.canonicalHash, financeTx);
  } finally {
    await client.end();
  }

  return {
    procurementTx,
    financeTx,
  };
}

async function createHashRecordForGraph(
  request: APIRequestContext,
  fixture: Pick<E2ESession, 'organizationId' | 'actorUserId'>,
  entityType: string,
  entityId: string,
) {
  return apiPost<{
    id: string;
    canonicalHash: string;
  }>(request, '/hash-records', {
    organizationId: fixture.organizationId,
    actorUserId: fixture.actorUserId,
    entityType,
    entityId,
    canonicalPayload: {
      entityType,
      entityId,
      scenario: 'graph-anchor-overlay-e2e',
    },
  });
}

async function insertAnchor(
  client: Client,
  fixture: Pick<E2ESession, 'organizationId'>,
  canonicalHash: string,
  transactionId: string,
) {
  await client.query(
    `insert into "AuditAnchor" (
       "id",
       "organizationId",
       "anchorType",
       "status",
       "rootHash",
       "metadata",
       "anchoredAt",
       "fabricTransactionId",
       "fabricBlockNumber",
       "fabricChannel",
       "fabricChaincode",
       "fabricCommitStatus",
       "fabricEndorsementStatus",
       "fabricVerifiedAt"
     ) values ($1, $2, 'FABRIC', 'ANCHORED', $3, $4::jsonb, now(), $5, 77, 'mepn-audit', 'audit-anchor', 'VALID', 'ENDORSED', null)`,
    [
      randomUUID(),
      fixture.organizationId,
      canonicalHash,
      JSON.stringify({
        fixture: true,
        scenario: 'graph-anchor-overlay-e2e',
      }),
      transactionId,
    ],
  );
}
