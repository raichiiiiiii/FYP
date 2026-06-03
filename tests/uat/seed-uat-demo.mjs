const apiBaseUrl =
  process.env.UAT_API_BASE_URL ||
  process.env.API_BASE_URL ||
  'http://localhost:3000/api/v1';

const suffix = new Date()
  .toISOString()
  .replace(/[-:.TZ]/g, '')
  .slice(0, 14);

const demoScenario = {
  organizationName: 'TechBuild Energy Sdn Bhd',
  buyerName: 'SolarTech Industries Sdn Bhd',
  supplierName: 'Mega Components Sdn Bhd',
  financierName: 'Amanah Islamic Bank',
  projectName: 'SolarTech Rooftop Solar Retrofit',
  buyerPoReference: 'BC-2026-089',
};

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
        scenario: {
          name: 'TechBuild rooftop solar restricted mudarabah UAT scenario',
          organization: demoScenario.organizationName,
          buyer: demoScenario.buyerName,
          supplier: demoScenario.supplierName,
          financier: demoScenario.financierName,
          note:
            'Seeded through API endpoints for UAT/demo only. Static frontend fixtures may still be used by dashboard, graph, and verification component tests.',
        },
        reviewerStartUrls: {
          dashboard: '/dashboard',
          organization: '/org/setup',
          procurement: '/procurement/requisitions',
          evidence: '/evidence/packs',
          audit: '/audit/search',
          finance: `/finance/applications/${finance.application.id}`,
          closure: '/finance/closures',
          graph: '/graph/projects',
          integrations: '/integrations',
          operations: '/operations',
          reports: '/reports',
        },
      },
      null,
      2,
    ),
  );
}

async function createOrganization() {
  const setup = await post('/orgs', {
    legalName: `${demoScenario.organizationName} UAT ${suffix}`,
    registrationNumber: `TB-UAT-${suffix}`,
    deploymentMode: 'standalone_sme',
    adminUser: {
      email: `aisha.admin-${suffix}@techbuild.example`,
      displayName: 'Aisha Rahman',
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
  const demoUsersByRole = {
    PROCUREMENT_OFFICER: {
      email: `ahmad.procurement-${suffix}@techbuild.example`,
      displayName: 'Ahmad Razali',
    },
    APPROVER: {
      email: `nurul.approver-${suffix}@techbuild.example`,
      displayName: 'Nurul Izzah',
    },
    FINANCIER_USER: {
      email: `omar.reviewer-${suffix}@amanah.example`,
      displayName: 'Omar Farouq',
    },
    SHARIAH_REVIEWER: {
      email: `hassan.shariah-${suffix}@panel.example`,
      displayName: 'Dr. Hassan Malik',
    },
    AUDITOR: {
      email: `lina.auditor-${suffix}@audit.example`,
      displayName: 'Lina Wong',
    },
  };

  for (const role of roleDefinitions) {
    const demoUser = demoUsersByRole[role.code];
    const user = await post('/users', {
      organizationId: setup.organization.id,
      actorUserId: setup.adminUser.id,
      email: demoUser.email,
      displayName: demoUser.displayName,
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
      name: `${demoScenario.supplierName} UAT ${suffix}`,
      email: `supplier-${suffix}@mega-components.example`,
    }),
  );
  const project = await post(
    '/projects',
    scoped({
      name: `${demoScenario.projectName} ${suffix}`,
      code: `SOLAR-UAT-${suffix}`,
      budget: 210000,
    }),
  );
  const requisition = await post(
    '/requisitions',
    scoped({
      projectId: project.id,
      requesterUserId: users.PROCUREMENT_OFFICER.id,
      title: `Solar components for ${demoScenario.buyerPoReference} ${suffix}`,
      justification:
        'UAT source-to-pay evidence scenario for a revenue-generating buyer purchase order',
      items: [
        {
          description: 'Solar panels batch 1',
          category: 'EQUIPMENT',
          quantity: 100,
          unitPrice: 1180,
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
      title: `Solar component supplier sourcing ${suffix}`,
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
      poNumber: `PO-2026-UAT-${suffix}`,
    }),
  );
  const issuedPurchaseOrder = await post(`/purchase-orders/${purchaseOrder.id}/issue`, {
    actorUserId: users.PROCUREMENT_OFFICER.id,
  });
  const receipt = await post(
    '/receipts',
    scoped({
      purchaseOrderId: purchaseOrder.id,
      notes: 'Solar panels received for UAT scenario',
    }),
  );
  const invoice = await post(
    '/invoices',
    scoped({
      purchaseOrderId: purchaseOrder.id,
      invoiceNumber: `INV-2026-UAT-${suffix}`,
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
    title: `SolarTech rooftop solar evidence pack ${suffix}`,
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
    title: `SolarTech rooftop solar restricted mudarabah opportunity ${suffix}`,
    description:
      `Source: buyer_purchase_order\nSource document: ${demoScenario.buyerPoReference}\nBuyer: ${demoScenario.buyerName}\nExpected revenue: 280000\nExpected cost: 210000\nEligibility: revenue-generating opportunity`,
    estimatedCapital: 180000,
    expectedProfit: 70000,
  });
  const application = await post('/applications', {
    organizationId: setup.organization.id,
    actorUserId: financeActor,
    opportunityId: opportunity.id,
    applicantUserId: users.PROCUREMENT_OFFICER.id,
    requestedCapital: 180000,
    capitalProviderRatio: 0.6,
    entrepreneurRatio: 0.4,
    purpose:
      'Restricted working capital for SolarTech buyer PO fulfillment; no guaranteed fixed return is seeded.',
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
    contractNumber: `CTR-2026-UAT-${suffix}`,
    restrictedUse:
      'Restricted to approved SolarTech rooftop solar procurement costs only',
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
    amount: 180000,
    reference: `DISB-2026-UAT-${suffix}`,
  });
  const ledgerEntry = await post('/project-ledgers/entries', {
    organizationId: setup.organization.id,
    actorUserId: financeActor,
    applicationId: application.id,
    entryType: 'REVENUE',
    description: 'SolarTech milestone payment received',
    amount: 280000,
  });
  const profitLossStatement = await post('/profit-loss/statements', {
    organizationId: setup.organization.id,
    actorUserId: financeActor,
    applicationId: application.id,
    revenue: 280000,
    costs: 210000,
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
      scenario: 'TechBuild rooftop solar restricted mudarabah UAT scenario',
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
