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
};

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
  await page.addInitScript((nextSession) => {
    window.localStorage.setItem(
      'mepn.organizationId',
      nextSession.organizationId,
    );
    window.localStorage.setItem('mepn.actorUserId', nextSession.actorUserId);
  }, session);
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
    approverUserId: activeSession.actorUserId,
  });
  await apiPost(request, `/requisitions/${requisition.id}/approve`, {
    actorUserId: activeSession.actorUserId,
    approverUserId: activeSession.actorUserId,
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
