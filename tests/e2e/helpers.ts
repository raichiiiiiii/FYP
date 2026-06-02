import type { APIRequestContext, Page } from '@playwright/test';
import { Client } from 'pg';

export const E2E_API_BASE_URL =
  process.env.E2E_API_BASE_URL ?? 'http://127.0.0.1:3100/api/v1';
export const E2E_DATABASE_URL =
  process.env.E2E_DATABASE_URL ??
  'postgresql://mepn:mepn@localhost:5432/mepn_e2e';

type JsonRecord = Record<string, unknown>;

export type E2ESession = {
  organizationId: string;
  actorUserId: string;
  legalName: string;
  email: string;
  displayName: string;
  roleCodes: string[];
  permissionCodes: string[];
};

type E2ERoleCode =
  | 'PROCUREMENT_OFFICER'
  | 'APPROVER'
  | 'FINANCIER_USER'
  | 'SHARIAH_REVIEWER'
  | 'AUDITOR';

const rolePermissionCodes: Record<E2ERoleCode, string[]> = {
  PROCUREMENT_OFFICER: ['procurement:create', 'audit:read'],
  APPROVER: ['procurement:approve', 'audit:read'],
  FINANCIER_USER: ['finance:review', 'audit:read'],
  SHARIAH_REVIEWER: ['shariah:review', 'audit:read'],
  AUDITOR: ['audit:read'],
};

const adminPermissionCodes = [
  'users:create',
  'procurement:create',
  'procurement:approve',
  'finance:review',
  'shariah:review',
  'audit:read',
];

export async function resetDatabase() {
  const client = new Client({ connectionString: E2E_DATABASE_URL });

  await client.connect();

  try {
    const result = await client.query<{ tablename: string }>(
      "select tablename from pg_tables where schemaname = 'public' and tablename <> '_prisma_migrations'",
    );
    const tableNames = result.rows.map((row) => quoteIdentifier(row.tablename));

    if (tableNames.length) {
      await client.query(
        `truncate table ${tableNames.join(', ')} restart identity cascade`,
      );
    }
  } finally {
    await client.end();
  }
}

export async function setSession(page: Page, session: E2ESession) {
  const authSession = {
    userId: session.actorUserId,
    email: session.email,
    displayName: session.displayName,
    organizationId: session.organizationId,
    roleCodes: session.roleCodes,
    permissionCodes: session.permissionCodes,
    workspaceScopes: [],
    expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
    authMode: 'dev',
    oidcEnabled: false,
  };

  await page.addInitScript((nextSession) => {
    window.localStorage.setItem('mepn.auth.session', JSON.stringify(nextSession));
  }, authSession);

  try {
    await page.evaluate((nextSession) => {
      window.localStorage.setItem(
        'mepn.auth.session',
        JSON.stringify(nextSession),
      );
    }, authSession);
  } catch {
    // The init script above still applies before the next app navigation.
  }
}

export async function apiGet<T>(
  request: APIRequestContext,
  path: string,
): Promise<T> {
  const response = await request.get(`${E2E_API_BASE_URL}${path}`);

  return parseApiResponse<T>('GET', path, response);
}

export async function apiPost<T>(
  request: APIRequestContext,
  path: string,
  body: JsonRecord = {},
): Promise<T> {
  const response = await request.post(`${E2E_API_BASE_URL}${path}`, {
    data: body,
  });

  return parseApiResponse<T>('POST', path, response);
}

export async function createOrganizationViaApi(
  request: APIRequestContext,
  label = 'E2E SME',
) {
  const suffix = uniqueSuffix();
  const setup = await apiPost<{
    organization: JsonRecord & { id: string; legalName: string };
    adminUser: JsonRecord & { id: string };
  }>(request, '/orgs', {
    legalName: `${label} ${suffix}`,
    registrationNumber: `E2E-${suffix}`,
    deploymentMode: 'standalone_sme',
    adminUser: {
      email: `admin-${suffix}@example.test`,
      displayName: 'E2E Admin',
    },
  });

  return {
    organizationId: setup.organization.id,
    actorUserId: setup.adminUser.id,
    legalName: setup.organization.legalName,
    email: `admin-${suffix}@example.test`,
    displayName: 'E2E Admin',
    roleCodes: ['ORG_ADMIN'],
    permissionCodes: adminPermissionCodes,
  } satisfies E2ESession;
}

export async function createUserSessionWithRole(
  request: APIRequestContext,
  adminSession: E2ESession,
  roleCode: E2ERoleCode,
) {
  const suffix = uniqueSuffix();
  const role = await apiPost<JsonRecord & { id: string }>(request, '/roles', {
    code: roleCode,
    name: roleCode
      .toLowerCase()
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' '),
    permissionCodes: rolePermissionCodes[roleCode],
    organizationId: adminSession.organizationId,
    actorUserId: adminSession.actorUserId,
  });
  const user = await apiPost<JsonRecord & { id: string }>(request, '/users', {
    email: `${roleCode.toLowerCase()}-${suffix}@example.test`,
    displayName: `${roleCode} E2E User`,
    organizationId: adminSession.organizationId,
    actorUserId: adminSession.actorUserId,
  });

  await apiPost(request, '/memberships', {
    organizationId: adminSession.organizationId,
    userId: user.id,
    roleId: role.id,
    actorUserId: adminSession.actorUserId,
  });

  return {
    ...adminSession,
    actorUserId: user.id,
    email: String(user.email),
    displayName: String(user.displayName),
    roleCodes: [roleCode],
    permissionCodes: rolePermissionCodes[roleCode],
  } satisfies E2ESession;
}

export async function createProcurementViaApi(
  request: APIRequestContext,
  session = undefined as E2ESession | undefined,
) {
  const activeSession = session ?? (await createOrganizationViaApi(request));
  const suffix = uniqueSuffix();
  const scoped = (body: JsonRecord) => ({
    organizationId: activeSession.organizationId,
    actorUserId: activeSession.actorUserId,
    ...body,
  });

  const project = await apiPost<JsonRecord & { id: string }>(
    request,
    '/projects',
    scoped({
      name: `E2E Procurement Project ${suffix}`,
      code: `E2E-PROC-${suffix}`,
      budget: 12000,
    }),
  );
  const supplier = await apiPost<JsonRecord & { id: string }>(
    request,
    '/suppliers',
    scoped({
      name: `E2E Supplier ${suffix}`,
      email: `supplier-${suffix}@example.test`,
    }),
  );
  const approver = await apiPost<JsonRecord & { id: string }>(
    request,
    '/users',
    scoped({
      email: `approver-${suffix}@example.test`,
      displayName: `E2E Approver ${suffix}`,
    }),
  );
  const requisition = await apiPost<JsonRecord & { id: string }>(
    request,
    '/requisitions',
    scoped({
      projectId: project.id,
      requesterUserId: activeSession.actorUserId,
      title: `E2E Materials ${suffix}`,
      justification: 'E2E source-to-pay evidence',
      items: [
        {
          description: 'Certified equipment',
          category: 'EQUIPMENT',
          quantity: 2,
          unitPrice: 3000,
        },
      ],
    }),
  );

  await apiPost(request, `/requisitions/${requisition.id}/submit`, {
    actorUserId: activeSession.actorUserId,
    approverUserId: approver.id,
  });
  await apiPost(request, `/requisitions/${requisition.id}/approve`, {
    actorUserId: approver.id,
    approverUserId: approver.id,
  });

  const rfq = await apiPost<JsonRecord & { id: string }>(
    request,
    '/rfqs',
    scoped({
      requisitionId: requisition.id,
      title: `E2E RFQ ${suffix}`,
    }),
  );
  await apiPost(request, `/rfqs/${rfq.id}/publish`, {
    actorUserId: activeSession.actorUserId,
  });

  const quotation = await apiPost<JsonRecord & { id: string }>(
    request,
    '/quotations',
    scoped({
      rfqId: rfq.id,
      supplierId: supplier.id,
    }),
  );
  const purchaseOrder = await apiPost<
    JsonRecord & { id: string; poNumber: string }
  >(
    request,
    '/purchase-orders',
    scoped({
      quotationId: quotation.id,
      poNumber: `PO-E2E-${suffix}`,
    }),
  );
  await apiPost(request, `/purchase-orders/${purchaseOrder.id}/issue`, {
    actorUserId: activeSession.actorUserId,
  });

  const receipt = await apiPost<JsonRecord & { id: string }>(
    request,
    '/receipts',
    scoped({
      purchaseOrderId: purchaseOrder.id,
      notes: 'E2E receipt recorded',
    }),
  );
  const invoice = await apiPost<JsonRecord & { id: string }>(
    request,
    '/invoices',
    scoped({
      purchaseOrderId: purchaseOrder.id,
      invoiceNumber: `INV-E2E-${suffix}`,
    }),
  );

  return {
    ...activeSession,
    project,
    supplier,
    requisition,
    rfq,
    quotation,
    purchaseOrder,
    receipt,
    invoice,
  };
}

export async function createEvidencePackViaApi(
  request: APIRequestContext,
  fixture: Awaited<ReturnType<typeof createProcurementViaApi>>,
) {
  return apiPost<JsonRecord & { id: string }>(request, '/evidence-packs', {
    organizationId: fixture.organizationId,
    actorUserId: fixture.actorUserId,
    projectId: fixture.project.id,
    title: `E2E Evidence Pack ${uniqueSuffix()}`,
  });
}

export async function createApprovedFinanceApplicationViaApi(
  request: APIRequestContext,
) {
  const fixture = await createProcurementViaApi(request);
  const evidencePack = await createEvidencePackViaApi(request, fixture);
  const opportunity = await apiPost<JsonRecord & { id: string }>(
    request,
    '/opportunities',
    {
      organizationId: fixture.organizationId,
      actorUserId: fixture.actorUserId,
      projectId: fixture.project.id,
      requisitionId: fixture.requisition.id,
      purchaseOrderId: fixture.purchaseOrder.id,
      evidencePackId: evidencePack.id,
      title: `E2E Finance Opportunity ${uniqueSuffix()}`,
      estimatedCapital: 6000,
      expectedProfit: 1200,
    },
  );
  const application = await apiPost<JsonRecord & { id: string }>(
    request,
    '/applications',
    {
      organizationId: fixture.organizationId,
      actorUserId: fixture.actorUserId,
      opportunityId: opportunity.id,
      requestedCapital: 6000,
      capitalProviderRatio: 0.6,
      entrepreneurRatio: 0.4,
    },
  );

  await apiPost(request, `/applications/${application.id}/submit`, {
    actorUserId: fixture.actorUserId,
  });
  await apiPost(request, `/applications/${application.id}/evidence-checklist`, {
    actorUserId: fixture.actorUserId,
  });
  await apiPost(request, `/applications/${application.id}/due-diligence`, {
    actorUserId: fixture.actorUserId,
    reviewerUserId: fixture.actorUserId,
    status: 'APPROVED',
    riskRating: 'MEDIUM',
    decision: 'APPROVED',
  });
  await apiPost(request, `/applications/${application.id}/shariah-review`, {
    actorUserId: fixture.actorUserId,
    reviewerUserId: fixture.actorUserId,
    status: 'APPROVED',
    decision: 'APPROVED',
  });
  const approvedApplication = await apiPost<JsonRecord & { id: string }>(
    request,
    `/applications/${application.id}/approve`,
    {
      actorUserId: fixture.actorUserId,
    },
  );

  return {
    ...fixture,
    evidencePack,
    opportunity,
    application: approvedApplication,
  };
}

export function uniqueSuffix() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function parseApiResponse<T>(
  method: string,
  path: string,
  response: Awaited<ReturnType<APIRequestContext['get']>>,
): Promise<T> {
  if (!response.ok()) {
    throw new Error(
      `${method} ${path} failed with ${response.status()}: ${await response.text()}`,
    );
  }

  return (await response.json()) as T;
}

function quoteIdentifier(identifier: string) {
  return `"${identifier.replace(/"/g, '""')}"`;
}
