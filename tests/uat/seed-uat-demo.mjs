const apiBaseUrl =
  process.env.UAT_API_BASE_URL ||
  process.env.API_BASE_URL ||
  'http://localhost:3000/api/v1';

const suffix = new Date()
  .toISOString()
  .replace(/[-:.TZ]/g, '')
  .slice(0, 14);

const roleDefinitions = [
  {
    code: 'PROCUREMENT_OFFICER',
    name: 'Procurement Officer',
    permissionCodes: ['procurement:create', 'audit:read'],
  },
  {
    code: 'APPROVER',
    name: 'Approver',
    permissionCodes: ['procurement:approve', 'audit:read'],
  },
  {
    code: 'FINANCIER_USER',
    name: 'Financier Reviewer',
    permissionCodes: ['finance:review', 'audit:read'],
  },
  {
    code: 'SHARIAH_REVIEWER',
    name: 'Shariah Reviewer',
    permissionCodes: ['shariah:review', 'audit:read'],
  },
  {
    code: 'AUDITOR',
    name: 'Auditor',
    permissionCodes: ['audit:read'],
  },
];

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

async function main() {
  if (process.argv.includes('--help')) {
    console.log(`Usage: pnpm seed:uat

Environment:
  UAT_API_BASE_URL  API base URL, default ${apiBaseUrl}

The API and PostgreSQL-backed app must be running before this script is used.`);
    return;
  }

  const setup = await createOrganization();
  const roles = await ensureRoles(setup);
  const users = await createRoleUsers(setup, roles);
  const procurement = await createProcurementFlow(setup, users);
  const evidencePack = await createEvidencePack(setup, procurement);
  const finance = await createFinanceFlow(setup, users, procurement, evidencePack);
  const integration = await createIntegrationRequest(setup, finance);

  console.log(
    JSON.stringify(
      {
        apiBaseUrl,
        organization: setup.organization,
        adminUser: setup.adminUser,
        roleUsers: users,
        procurement,
        evidencePack,
        finance,
        integration,
        reviewerStartUrls: {
          dashboard: '/dashboard',
          organization: '/org/setup',
          procurement: '/procurement/requisitions',
          evidence: '/evidence/packs',
          audit: '/audit/search',
          finance: `/finance/applications/${finance.application.id}`,
          closure: '/finance/closures',
          integrations: '/integrations',
        },
      },
      null,
      2,
    ),
  );
}

async function createOrganization() {
  const setup = await post('/orgs', {
    legalName: `UAT SME Sdn Bhd ${suffix}`,
    registrationNumber: `UAT-${suffix}`,
    deploymentMode: 'standalone_sme',
    adminUser: {
      email: `uat-admin-${suffix}@example.test`,
      displayName: 'UAT SME Admin',
    },
  });

  return {
    organization: setup.organization,
    adminUser: setup.adminUser,
  };
}

async function ensureRoles(setup) {
  const existingRoles = await get('/roles');
  const rolesByCode = new Map(existingRoles.map((role) => [role.code, role]));

  for (const role of roleDefinitions) {
    if (!rolesByCode.has(role.code)) {
      const created = await post('/roles', {
        ...role,
        organizationId: setup.organization.id,
        actorUserId: setup.adminUser.id,
      });
      rolesByCode.set(role.code, created);
    }
  }

  return Object.fromEntries(
    roleDefinitions.map((role) => [role.code, rolesByCode.get(role.code)]),
  );
}

async function createRoleUsers(setup, roles) {
  const users = {};

  for (const role of roleDefinitions) {
    const user = await post('/users', {
      organizationId: setup.organization.id,
      actorUserId: setup.adminUser.id,
      email: `uat-${role.code.toLowerCase()}-${suffix}@example.test`,
      displayName: `UAT ${role.name}`,
    });

    await post('/memberships', {
      organizationId: setup.organization.id,
      actorUserId: setup.adminUser.id,
      userId: user.id,
      roleId: roles[role.code].id,
    });

    users[role.code] = user;
  }

  return users;
}

async function createProcurementFlow(setup, users) {
  const scoped = (body) => ({
    organizationId: setup.organization.id,
    actorUserId: users.PROCUREMENT_OFFICER.id,
    ...body,
  });

  const supplier = await post(
    '/suppliers',
    scoped({
      name: `UAT Certified Supplier ${suffix}`,
      email: `supplier-${suffix}@example.test`,
    }),
  );
  const project = await post(
    '/projects',
    scoped({
      name: `UAT Procurement Project ${suffix}`,
      code: `UAT-PROC-${suffix}`,
      budget: 12000,
    }),
  );
  const requisition = await post(
    '/requisitions',
    scoped({
      projectId: project.id,
      requesterUserId: users.PROCUREMENT_OFFICER.id,
      title: `UAT Materials Requisition ${suffix}`,
      justification: 'UAT source-to-pay evidence scenario',
      items: [
        {
          description: 'Certified project equipment',
          category: 'EQUIPMENT',
          quantity: 2,
          unitPrice: 3000,
        },
      ],
    }),
  );

  await post(`/requisitions/${requisition.id}/submit`, {
    actorUserId: users.PROCUREMENT_OFFICER.id,
    approverUserId: users.APPROVER.id,
  });
  const approvedRequisition = await post(`/requisitions/${requisition.id}/approve`, {
    actorUserId: users.APPROVER.id,
    approverUserId: users.APPROVER.id,
  });
  const rfq = await post(
    '/rfqs',
    scoped({
      requisitionId: requisition.id,
      title: `UAT RFQ ${suffix}`,
    }),
  );
  await post(`/rfqs/${rfq.id}/publish`, {
    actorUserId: users.PROCUREMENT_OFFICER.id,
  });
  const quotation = await post(
    '/quotations',
    scoped({
      rfqId: rfq.id,
      supplierId: supplier.id,
    }),
  );
  const purchaseOrder = await post(
    '/purchase-orders',
    scoped({
      quotationId: quotation.id,
      poNumber: `PO-UAT-${suffix}`,
    }),
  );
  const issuedPurchaseOrder = await post(`/purchase-orders/${purchaseOrder.id}/issue`, {
    actorUserId: users.PROCUREMENT_OFFICER.id,
  });
  const receipt = await post(
    '/receipts',
    scoped({
      purchaseOrderId: purchaseOrder.id,
      notes: 'UAT receipt recorded',
    }),
  );
  const invoice = await post(
    '/invoices',
    scoped({
      purchaseOrderId: purchaseOrder.id,
      invoiceNumber: `INV-UAT-${suffix}`,
    }),
  );

  return {
    supplier,
    project,
    requisition: approvedRequisition,
    rfq,
    quotation,
    purchaseOrder: issuedPurchaseOrder,
    receipt,
    invoice,
  };
}

async function createEvidencePack(setup, procurement) {
  const evidencePack = await post('/evidence-packs', {
    organizationId: setup.organization.id,
    actorUserId: setup.adminUser.id,
    projectId: procurement.project.id,
    title: `UAT Evidence Pack ${suffix}`,
  });

  await post(`/evidence-packs/${evidencePack.id}/export`, {
    actorUserId: setup.adminUser.id,
  });

  return evidencePack;
}

async function createFinanceFlow(setup, users, procurement, evidencePack) {
  const financeActor = users.FINANCIER_USER.id;
  const opportunity = await post('/opportunities', {
    organizationId: setup.organization.id,
    actorUserId: financeActor,
    projectId: procurement.project.id,
    requisitionId: procurement.requisition.id,
    purchaseOrderId: procurement.purchaseOrder.id,
    evidencePackId: evidencePack.id,
    title: `UAT Mudarabah Opportunity ${suffix}`,
    estimatedCapital: 6000,
    expectedProfit: 1200,
  });
  const application = await post('/applications', {
    organizationId: setup.organization.id,
    actorUserId: financeActor,
    opportunityId: opportunity.id,
    requestedCapital: 6000,
    capitalProviderRatio: 0.6,
    entrepreneurRatio: 0.4,
  });

  await post(`/applications/${application.id}/submit`, {
    actorUserId: financeActor,
  });
  await post(`/applications/${application.id}/evidence-checklist`, {
    actorUserId: financeActor,
  });
  await post(`/applications/${application.id}/due-diligence`, {
    actorUserId: users.FINANCIER_USER.id,
    reviewerUserId: users.FINANCIER_USER.id,
    status: 'APPROVED',
    riskRating: 'MEDIUM',
    decision: 'APPROVED',
    notes: 'UAT due diligence approved for controlled demo.',
  });
  await post(`/applications/${application.id}/shariah-review`, {
    actorUserId: users.SHARIAH_REVIEWER.id,
    reviewerUserId: users.SHARIAH_REVIEWER.id,
    status: 'APPROVED',
    decision: 'APPROVED',
    notes: 'UAT Shariah review approved for controlled demo.',
  });
  const approvedApplication = await post(`/applications/${application.id}/approve`, {
    actorUserId: financeActor,
  });
  const contract = await post('/contracts', {
    organizationId: setup.organization.id,
    actorUserId: financeActor,
    applicationId: application.id,
    restrictedUse: 'Restricted to UAT procurement project costs only',
  });

  await post(`/contracts/${contract.id}/generate-document`, {
    actorUserId: financeActor,
    signerEmail: setup.adminUser.email,
  });
  await post(`/contracts/${contract.id}/mark-signed`, {
    actorUserId: financeActor,
  });
  const disbursement = await post('/disbursements', {
    organizationId: setup.organization.id,
    actorUserId: financeActor,
    applicationId: application.id,
    contractId: contract.id,
    amount: 6000,
    reference: `UAT-DISB-${suffix}`,
  });
  const ledgerEntry = await post('/project-ledgers/entries', {
    organizationId: setup.organization.id,
    actorUserId: financeActor,
    applicationId: application.id,
    entryType: 'REVENUE',
    description: 'UAT project revenue',
    amount: 14000,
  });
  const profitLossStatement = await post('/profit-loss/statements', {
    organizationId: setup.organization.id,
    actorUserId: financeActor,
    applicationId: application.id,
    revenue: 14000,
    costs: 6000,
  });
  const closure = await post('/closures', {
    organizationId: setup.organization.id,
    actorUserId: financeActor,
    applicationId: application.id,
    evidencePackId: evidencePack.id,
  });

  return {
    opportunity,
    application: approvedApplication,
    contract,
    disbursement,
    ledgerEntry,
    profitLossStatement,
    closure,
  };
}

async function createIntegrationRequest(setup, finance) {
  return post('/integrations/finance-api/notifications', {
    organizationId: setup.organization.id,
    actorUserId: setup.adminUser.id,
    aggregateType: 'MudarabahApplication',
    aggregateId: finance.application.id,
    notificationType: 'UAT_APPLICATION_READY',
    payload: {
      seededAt: new Date().toISOString(),
      scenario: 'UAT readiness',
    },
  });
}

async function get(path) {
  const response = await fetch(`${apiBaseUrl}${path}`);
  return parseResponse('GET', path, response);
}

async function post(path, body) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  return parseResponse('POST', path, response);
}

async function parseResponse(method, path, response) {
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(
      `${method} ${path} failed with ${response.status}: ${JSON.stringify(body)}`,
    );
  }

  return body;
}
