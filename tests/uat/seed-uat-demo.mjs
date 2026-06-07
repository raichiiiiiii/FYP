import { createHash, randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const rootDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
);

process.env.DATABASE_URL ||= 'postgresql://mepn:mepn@localhost:5432/mepn';

const demoPassword = 'password';
const passwordHash = `sha256:${createHash('sha256')
  .update(demoPassword)
  .digest('hex')}`;

const { PrismaClient } = await import(
  pathToFileURL(
    path.join(rootDir, 'apps/api/node_modules/@prisma/client/index.js'),
  )
);
const { PrismaPg } = await import(
  pathToFileURL(
    path.join(
      rootDir,
      'apps/api/node_modules/@prisma/adapter-pg/dist/index.mjs',
    ),
  )
);

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const basePermissions = {
  ORG_ADMIN: [
    'users:create',
    'procurement:create',
    'procurement:approve',
    'finance:review',
    'shariah:review',
    'audit:read',
    'fabric:governance',
  ],
  PLATFORM_OPERATOR: ['audit:read', 'fabric:operate'],
  FABRIC_OPERATOR: ['audit:read', 'fabric:operate'],
  SUPPORT_OPERATOR: ['audit:read'],
  SECURITY_OPERATOR: ['audit:read'],
  PROCUREMENT_OFFICER: ['procurement:create', 'audit:read'],
  APPROVER_MANAGER: ['procurement:approve', 'audit:read'],
  FINANCE_ACCOUNTANT: ['finance:review', 'audit:read'],
  RECEIVING_OFFICER: ['procurement:create', 'audit:read'],
  AUDIT_VIEWER: ['audit:read'],
  SUPPLIER_SALES: ['procurement:create', 'audit:read'],
  MUDARIB_OPERATOR: ['finance:review', 'audit:read'],
  SUPPLIER_FINANCE: ['finance:review', 'audit:read'],
  EVIDENCE_SUBMITTER: ['procurement:create', 'audit:read'],
  INVESTMENT_OFFICER: ['finance:review', 'audit:read'],
  RISK_REVIEWER: ['finance:review', 'audit:read'],
  DISBURSEMENT_OFFICER: ['finance:review', 'audit:read'],
  FINANCIER_AUDIT_VIEWER: ['audit:read'],
  SHARIAH_REVIEWER: ['shariah:review', 'audit:read'],
  COMPLIANCE_REVIEWER: ['shariah:review', 'audit:read'],
  CONTRACT_REVIEWER: ['shariah:review', 'audit:read'],
  AUDITOR: ['audit:read'],
  REGULATOR_REVIEWER: ['audit:read'],
  READ_ONLY_EVIDENCE_VIEWER: ['audit:read'],
  DEVELOPER_INTEGRATOR: ['audit:read', 'fabric:operate'],
  ERP_INTEGRATOR: ['audit:read'],
  API_CLIENT_MANAGER: ['audit:read'],
};

const organizationNodes = [
  {
    key: 'platform',
    type: 'PLATFORM_OPERATOR',
    legalName: 'MEPN Platform Operator',
    registrationNumber: 'MEPN-PLATFORM-LOCAL',
    deploymentMode: 'fabric_organization',
    admin: {
      email: 'platform.admin@mepn.local',
      displayName: 'Platform Admin',
      roleCode: 'ORG_ADMIN',
    },
    users: [
      {
        email: 'fabric.operator@mepn.local',
        displayName: 'Fabric Operator',
        roleCode: 'FABRIC_OPERATOR',
      },
      {
        email: 'support.operator@mepn.local',
        displayName: 'Support Operator',
        roleCode: 'SUPPORT_OPERATOR',
      },
    ],
    roles: [
      'ORG_ADMIN',
      'PLATFORM_OPERATOR',
      'FABRIC_OPERATOR',
      'SUPPORT_OPERATOR',
      'SECURITY_OPERATOR',
    ],
  },
  {
    key: 'buyer',
    type: 'SME_BUYER',
    legalName: 'Amanah Retail Sdn Bhd',
    registrationNumber: 'AMANAH-RETAIL-LOCAL',
    deploymentMode: 'standalone_sme',
    shariahProfile: 'Eligible halal retail procurement buyer node',
    logoImageUrl:
      'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22128%22 height=%22128%22 viewBox=%220 0 128 128%22%3E%3Crect width=%22128%22 height=%22128%22 rx=%2224%22 fill=%22%230f766e%22/%3E%3Ctext x=%2264%22 y=%2274%22 text-anchor=%22middle%22 font-family=%22Arial%22 font-size=%2234%22 font-weight=%22700%22 fill=%22white%22%3EARS%3C/text%3E%3C/svg%3E',
    bannerImageUrl:
      'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%221200%22 height=%22320%22 viewBox=%220 0 1200 320%22%3E%3Crect width=%221200%22 height=%22320%22 fill=%22%230f766e%22/%3E%3Crect y=%22212%22 width=%221200%22 height=%22108%22 fill=%22%2314b8a6%22 opacity=%220.42%22/%3E%3Ctext x=%2280%22 y=%22170%22 font-family=%22Arial%22 font-size=%2256%22 font-weight=%22700%22 fill=%22white%22%3EAmanah Retail Sdn Bhd%3C/text%3E%3C/svg%3E',
    admin: {
      email: 'buyer.admin@amanah.local',
      displayName: 'Amanah Buyer Admin',
      roleCode: 'ORG_ADMIN',
    },
    users: [
      {
        email: 'procurement.officer@amanah.local',
        displayName: 'Procurement Officer',
        roleCode: 'PROCUREMENT_OFFICER',
      },
      {
        email: 'approver.manager@amanah.local',
        displayName: 'Approver Manager',
        roleCode: 'APPROVER_MANAGER',
      },
      {
        email: 'finance.accountant@amanah.local',
        displayName: 'Finance Accountant',
        roleCode: 'FINANCE_ACCOUNTANT',
      },
      {
        email: 'receiving.officer@amanah.local',
        displayName: 'Receiving Officer',
        roleCode: 'RECEIVING_OFFICER',
      },
    ],
    roles: [
      'ORG_ADMIN',
      'PROCUREMENT_OFFICER',
      'APPROVER_MANAGER',
      'FINANCE_ACCOUNTANT',
      'RECEIVING_OFFICER',
      'AUDIT_VIEWER',
    ],
  },
  {
    key: 'supplier',
    type: 'SME_SUPPLIER_MUDARIB',
    legalName: 'Barakah Supplies Sdn Bhd',
    registrationNumber: 'BARAKAH-SUPPLIES-LOCAL',
    deploymentMode: 'standalone_sme',
    shariahProfile: 'Halal packaged-food supplier and mudarib node',
    admin: {
      email: 'supplier.admin@barakah.local',
      displayName: 'Barakah Supplier Admin',
      roleCode: 'ORG_ADMIN',
    },
    users: [
      {
        email: 'supplier.sales@barakah.local',
        displayName: 'Supplier Sales User',
        roleCode: 'SUPPLIER_SALES',
      },
      {
        email: 'mudarib.operator@barakah.local',
        displayName: 'Mudarib Operator',
        roleCode: 'MUDARIB_OPERATOR',
      },
      {
        email: 'supplier.finance@barakah.local',
        displayName: 'Supplier Finance',
        roleCode: 'SUPPLIER_FINANCE',
      },
    ],
    roles: [
      'ORG_ADMIN',
      'SUPPLIER_SALES',
      'MUDARIB_OPERATOR',
      'SUPPLIER_FINANCE',
      'EVIDENCE_SUBMITTER',
    ],
  },
  {
    key: 'financier',
    type: 'FINANCIAL_ENTITY',
    legalName: 'Mabrur Finance Partner',
    registrationNumber: 'MABRUR-FINANCE-LOCAL',
    deploymentMode: 'financial_entity_node',
    admin: {
      email: 'financier.admin@mabrur.local',
      displayName: 'Mabrur Financier Admin',
      roleCode: 'ORG_ADMIN',
    },
    users: [
      {
        email: 'investment.officer@mabrur.local',
        displayName: 'Investment Officer',
        roleCode: 'INVESTMENT_OFFICER',
      },
      {
        email: 'disbursement.officer@mabrur.local',
        displayName: 'Disbursement Officer',
        roleCode: 'DISBURSEMENT_OFFICER',
      },
      {
        email: 'risk.reviewer@mabrur.local',
        displayName: 'Risk Reviewer',
        roleCode: 'RISK_REVIEWER',
      },
    ],
    roles: [
      'ORG_ADMIN',
      'INVESTMENT_OFFICER',
      'RISK_REVIEWER',
      'DISBURSEMENT_OFFICER',
      'FINANCIER_AUDIT_VIEWER',
    ],
  },
  {
    key: 'shariah',
    type: 'SHARIAH_COMPLIANCE',
    legalName: 'Hidayah Shariah Advisory',
    registrationNumber: 'HIDAYAH-SHARIAH-LOCAL',
    deploymentMode: 'financial_entity_node',
    admin: {
      email: 'shariah.admin@hidayah.local',
      displayName: 'Hidayah Shariah Admin',
      roleCode: 'ORG_ADMIN',
    },
    users: [
      {
        email: 'shariah.reviewer@hidayah.local',
        displayName: 'Shariah Reviewer',
        roleCode: 'SHARIAH_REVIEWER',
      },
      {
        email: 'compliance.reviewer@hidayah.local',
        displayName: 'Compliance Reviewer',
        roleCode: 'COMPLIANCE_REVIEWER',
      },
    ],
    roles: [
      'ORG_ADMIN',
      'SHARIAH_REVIEWER',
      'COMPLIANCE_REVIEWER',
      'CONTRACT_REVIEWER',
    ],
  },
  {
    key: 'auditor',
    type: 'AUDITOR_REGULATOR',
    legalName: 'Raudhah Audit and Regulatory Review',
    registrationNumber: 'RAUDHAH-AUDIT-LOCAL',
    deploymentMode: 'fabric_organization',
    admin: {
      email: 'auditor.admin@raudah.local',
      displayName: 'Raudhah Auditor Admin',
      roleCode: 'ORG_ADMIN',
    },
    users: [
      {
        email: 'auditor.user@raudah.local',
        displayName: 'Auditor User',
        roleCode: 'AUDITOR',
      },
      {
        email: 'regulator.user@raudah.local',
        displayName: 'Regulator User',
        roleCode: 'REGULATOR_REVIEWER',
      },
    ],
    roles: [
      'ORG_ADMIN',
      'AUDITOR',
      'REGULATOR_REVIEWER',
      'READ_ONLY_EVIDENCE_VIEWER',
    ],
  },
  {
    key: 'integrator',
    type: 'DEVELOPER_INTEGRATOR',
    legalName: 'Nusantara Integration Services',
    registrationNumber: 'NUSANTARA-INTEGRATION-LOCAL',
    deploymentMode: 'fabric_organization',
    admin: {
      email: 'integrator.admin@nusantara.local',
      displayName: 'Nusantara Integrator Admin',
      roleCode: 'ORG_ADMIN',
    },
    users: [
      {
        email: 'erp.integrator@nusantara.local',
        displayName: 'ERP Integrator',
        roleCode: 'ERP_INTEGRATOR',
      },
      {
        email: 'api.integrator@nusantara.local',
        displayName: 'API Integrator',
        roleCode: 'API_CLIENT_MANAGER',
      },
    ],
    roles: [
      'ORG_ADMIN',
      'DEVELOPER_INTEGRATOR',
      'ERP_INTEGRATOR',
      'API_CLIENT_MANAGER',
    ],
  },
];

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

async function main() {
  if (process.argv.includes('--help')) {
    console.log(`Usage: corepack pnpm seed:uat

Seeds deterministic local/UAT organization-node accounts and one procurement
to mudarabah evidence chain. The script writes only password hashes and does
not create real Fabric topology or verified Fabric proof.

Environment:
  DATABASE_URL  PostgreSQL URL, default ${process.env.DATABASE_URL}`);
    return;
  }

  await ensureRoles();
  const nodes = await seedOrganizationNodes();
  const procurement = await seedProcurementChain(nodes);
  const finance = await seedMudarabahChain(nodes, procurement);
  const integrations = await seedIntegrationEvidence(nodes, finance);
  const fabricGovernance = await seedFabricGovernanceReadiness(nodes);

  const summary = {
    databaseUrl: redactDatabaseUrl(process.env.DATABASE_URL),
    generatedAt: new Date().toISOString(),
    password: 'not printed; see README local/demo setup',
    roleModelLimitation:
      'Current MVP assigns one primary role per user per organization.',
    fabricBoundary:
      'Seed creates operator-assisted readiness metadata only. It does not create or join real Fabric channels and does not seed positive Fabric verification.',
    organizations: Object.fromEntries(
      Object.entries(nodes).map(([key, node]) => [
        key,
        {
          id: node.organization.id,
          legalName: node.organization.legalName,
          deploymentMode: node.organization.deploymentMode,
          adminUserId: node.admin.id,
          adminEmail: node.admin.email,
          users: Object.values(node.users).map((user) => ({
            id: user.id,
            email: user.email,
            roleCode: user.roleCode,
          })),
        },
      ]),
    ),
    reviewerStartUrls: {
      dashboard: '/dashboard',
      organizationProfile: '/organization/profile',
      procurement: '/procurement',
      financeOpportunities: '/finance/opportunities',
      financeApplications: '/finance/applications',
      financeContracts: '/finance/contracts',
      financeClosures: '/finance/closures',
      evidence: '/evidence/packs',
      audit: '/audit',
      graph: '/graph/projects',
      integrations: '/integrations',
      fabricGovernance: '/fabric-governance',
      operations: '/operations',
      reports: '/reports',
    },
    procurement,
    finance,
    integrations,
    fabricGovernance,
  };

  console.log(JSON.stringify(summary, null, 2));
}

async function ensureRoles() {
  const allPermissionCodes = new Set(Object.values(basePermissions).flat());

  for (const permissionCode of allPermissionCodes) {
    await prisma.permission.upsert({
      where: { code: permissionCode },
      update: {
        name: displayName(permissionCode),
        description: `Local/UAT permission for ${permissionCode}`,
      },
      create: {
        code: permissionCode,
        name: displayName(permissionCode),
        description: `Local/UAT permission for ${permissionCode}`,
      },
    });
  }

  for (const roleCode of Object.keys(basePermissions)) {
    await prisma.role.upsert({
      where: { code: roleCode },
      update: {
        name: displayName(roleCode),
        description: `Local/UAT system role ${roleCode}`,
      },
      create: {
        code: roleCode,
        name: displayName(roleCode),
        description: `Local/UAT system role ${roleCode}`,
        permissions: {
          connect: basePermissions[roleCode].map((code) => ({ code })),
        },
      },
    });
  }
}

async function seedOrganizationNodes() {
  const nodes = {};

  for (const definition of organizationNodes) {
    const organization = await ensureOrganization(definition);
    const workspace = await ensureWorkspace(organization.id);
    const admin = await ensureUser(definition.admin, organization, workspace);
    const users = {};

    await ensureMembership({
      organizationId: organization.id,
      userId: admin.id,
      roleCode: definition.admin.roleCode,
    });

    for (const userDefinition of definition.users) {
      const user = await ensureUser(userDefinition, organization, workspace);
      await ensureMembership({
        organizationId: organization.id,
        userId: user.id,
        roleCode: userDefinition.roleCode,
      });
      users[userDefinition.email] = {
        ...user,
        roleCode: userDefinition.roleCode,
      };
    }

    nodes[definition.key] = {
      definition,
      organization,
      workspace,
      admin: {
        ...admin,
        roleCode: definition.admin.roleCode,
      },
      users,
    };
  }

  return nodes;
}

async function ensureOrganization(definition) {
  const existing = await prisma.organization.findFirst({
    where: { registrationNumber: definition.registrationNumber },
  });
  const data = {
    legalName: definition.legalName,
    registrationNumber: definition.registrationNumber,
    shariahProfile: definition.shariahProfile ?? null,
    deploymentMode: definition.deploymentMode,
    logoImageUrl: definition.logoImageUrl ?? null,
    bannerImageUrl: definition.bannerImageUrl ?? null,
  };

  if (existing) {
    return prisma.organization.update({
      where: { id: existing.id },
      data,
    });
  }

  return prisma.organization.create({ data });
}

async function ensureWorkspace(organizationId) {
  const existing = await prisma.workspace.findFirst({
    where: {
      organizationId,
      type: 'general',
      name: 'General Workspace',
    },
  });

  if (existing) {
    return existing;
  }

  return prisma.workspace.create({
    data: {
      organizationId,
      name: 'General Workspace',
      type: 'general',
      status: 'active',
    },
  });
}

async function ensureUser(definition, organization, workspace) {
  const email = definition.email.toLowerCase();

  return prisma.user.upsert({
    where: { email },
    update: {
      displayName: definition.displayName,
      passwordHash,
      profileImageUrl: definition.profileImageUrl ?? null,
      status: 'active',
    },
    create: {
      email,
      displayName: definition.displayName,
      passwordHash,
      profileImageUrl: definition.profileImageUrl ?? null,
      status: 'active',
      auditEvents: {
        create: {
          organizationId: organization.id,
          eventType: 'UAT_NODE_USER_SEEDED',
          entityType: 'User',
          correlationId: `uat-node-user-${email}`,
          metadata: {
            workspaceId: workspace.id,
            roleCode: definition.roleCode,
            seededCredential: 'passwordHash only',
          },
        },
      },
    },
  });
}

async function ensureMembership({ organizationId, userId, roleCode }) {
  const role = await prisma.role.findUniqueOrThrow({
    where: { code: roleCode },
  });

  return prisma.membership.upsert({
    where: {
      organizationId_userId: {
        organizationId,
        userId,
      },
    },
    update: {
      roleId: role.id,
      status: 'active',
    },
    create: {
      organizationId,
      userId,
      roleId: role.id,
      status: 'active',
    },
  });
}

async function seedProcurementChain(nodes) {
  const buyerOrg = nodes.buyer.organization;
  const procurementOfficer = nodes.buyer.users['procurement.officer@amanah.local'];
  const approver = nodes.buyer.users['approver.manager@amanah.local'];

  const project = await ensureFirst({
    model: prisma.project,
    where: {
      organizationId: buyerOrg.id,
      code: 'AMANAH-RAMADAN-2026',
    },
    update: {
      name: 'Amanah Retail Ramadan Stock Replenishment',
      description:
        'Seeded local/UAT buyer project for SRS procure-to-pay and mudarabah evidence walkthrough.',
      status: 'active',
      budget: 125000,
    },
    create: {
      organizationId: buyerOrg.id,
      name: 'Amanah Retail Ramadan Stock Replenishment',
      code: 'AMANAH-RAMADAN-2026',
      description:
        'Seeded local/UAT buyer project for SRS procure-to-pay and mudarabah evidence walkthrough.',
      status: 'active',
      budget: 125000,
    },
  });
  const supplier = await ensureFirst({
    model: prisma.supplier,
    where: {
      organizationId: buyerOrg.id,
      name: 'Barakah Supplies Sdn Bhd',
    },
    update: {
      email: 'supplier.sales@barakah.local',
      phone: '+60-3-5555-0101',
      status: 'approved',
    },
    create: {
      organizationId: buyerOrg.id,
      name: 'Barakah Supplies Sdn Bhd',
      email: 'supplier.sales@barakah.local',
      phone: '+60-3-5555-0101',
      status: 'approved',
    },
  });
  const requisition = await ensureFirst({
    model: prisma.requisition,
    where: {
      organizationId: buyerOrg.id,
      title: 'Purchase halal packaged food inventory',
    },
    update: {
      projectId: project.id,
      requesterUserId: procurementOfficer.id,
      justification:
        'Approved Ramadan retail stock replenishment need linked to supplier financing evidence.',
      status: 'APPROVED',
      totalAmount: 50000,
      submittedAt: fixedDate(-15),
      approvedAt: fixedDate(-14),
      rejectedAt: null,
    },
    create: {
      organizationId: buyerOrg.id,
      projectId: project.id,
      requesterUserId: procurementOfficer.id,
      title: 'Purchase halal packaged food inventory',
      justification:
        'Approved Ramadan retail stock replenishment need linked to supplier financing evidence.',
      status: 'APPROVED',
      totalAmount: 50000,
      submittedAt: fixedDate(-15),
      approvedAt: fixedDate(-14),
    },
  });

  await prisma.requisitionItem.deleteMany({
    where: { requisitionId: requisition.id },
  });
  const requisitionItems = await Promise.all([
    prisma.requisitionItem.create({
      data: {
        requisitionId: requisition.id,
        description: 'Halal packaged food inventory - dry goods',
        category: 'INVENTORY',
        quantity: 500,
        unitPrice: 60,
      },
    }),
    prisma.requisitionItem.create({
      data: {
        requisitionId: requisition.id,
        description: 'Halal packaged food inventory - beverage packs',
        category: 'INVENTORY',
        quantity: 400,
        unitPrice: 50,
      },
    }),
  ]);

  await ensureFirst({
    model: prisma.approvalRequest,
    where: {
      requisitionId: requisition.id,
      approverUserId: approver.id,
    },
    update: {
      status: 'APPROVED',
      decision: 'APPROVED',
      comment: 'Approved for Ramadan campaign replenishment.',
      decidedAt: fixedDate(-14),
    },
    create: {
      requisitionId: requisition.id,
      approverUserId: approver.id,
      status: 'APPROVED',
      decision: 'APPROVED',
      comment: 'Approved for Ramadan campaign replenishment.',
      decidedAt: fixedDate(-14),
    },
  });

  const rfq = await ensureFirst({
    model: prisma.rFQ,
    where: {
      organizationId: buyerOrg.id,
      requisitionId: requisition.id,
      title: 'RFQ for Ramadan halal packaged inventory',
    },
    update: {
      status: 'PUBLISHED',
      publishedAt: fixedDate(-13),
    },
    create: {
      organizationId: buyerOrg.id,
      requisitionId: requisition.id,
      title: 'RFQ for Ramadan halal packaged inventory',
      status: 'PUBLISHED',
      publishedAt: fixedDate(-13),
    },
  });

  await prisma.rFQItem.deleteMany({ where: { rfqId: rfq.id } });
  const rfqItems = await Promise.all(
    requisitionItems.map((item) =>
      prisma.rFQItem.create({
        data: {
          rfqId: rfq.id,
          requisitionItemId: item.id,
          description: item.description,
          quantity: item.quantity,
          targetPrice: item.unitPrice,
        },
      }),
    ),
  );

  const quotation = await ensureFirst({
    model: prisma.quotation,
    where: {
      organizationId: buyerOrg.id,
      rfqId: rfq.id,
      supplierId: supplier.id,
    },
    update: {
      status: 'ACCEPTED',
      totalAmount: 50000,
      receivedAt: fixedDate(-12),
    },
    create: {
      organizationId: buyerOrg.id,
      rfqId: rfq.id,
      supplierId: supplier.id,
      status: 'ACCEPTED',
      totalAmount: 50000,
      receivedAt: fixedDate(-12),
    },
  });

  await prisma.quotationItem.deleteMany({
    where: { quotationId: quotation.id },
  });
  await Promise.all(
    rfqItems.map((item, index) =>
      prisma.quotationItem.create({
        data: {
          quotationId: quotation.id,
          rfqItemId: item.id,
          description: item.description,
          quantity: item.quantity,
          unitPrice: index === 0 ? 60 : 50,
        },
      }),
    ),
  );

  const purchaseOrder = await prisma.purchaseOrder.upsert({
    where: {
      organizationId_poNumber: {
        organizationId: buyerOrg.id,
        poNumber: 'PO-AMANAH-RAMADAN-001',
      },
    },
    update: {
      requisitionId: requisition.id,
      quotationId: quotation.id,
      supplierId: supplier.id,
      status: 'ISSUED',
      totalAmount: 50000,
      issuedAt: fixedDate(-10),
    },
    create: {
      organizationId: buyerOrg.id,
      requisitionId: requisition.id,
      quotationId: quotation.id,
      supplierId: supplier.id,
      poNumber: 'PO-AMANAH-RAMADAN-001',
      status: 'ISSUED',
      totalAmount: 50000,
      issuedAt: fixedDate(-10),
    },
  });

  await prisma.purchaseOrderItem.deleteMany({
    where: { purchaseOrderId: purchaseOrder.id },
  });
  await Promise.all(
    requisitionItems.map((item) =>
      prisma.purchaseOrderItem.create({
        data: {
          purchaseOrderId: purchaseOrder.id,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        },
      }),
    ),
  );

  const receipt = await ensureFirst({
    model: prisma.receipt,
    where: {
      organizationId: buyerOrg.id,
      purchaseOrderId: purchaseOrder.id,
    },
    update: {
      status: 'RECORDED',
      receivedAt: fixedDate(-6),
      notes: 'Accepted receipt for UAT source-to-pay scenario.',
    },
    create: {
      organizationId: buyerOrg.id,
      purchaseOrderId: purchaseOrder.id,
      status: 'RECORDED',
      receivedAt: fixedDate(-6),
      notes: 'Accepted receipt for UAT source-to-pay scenario.',
    },
  });
  const invoice = await prisma.invoice.upsert({
    where: {
      organizationId_invoiceNumber: {
        organizationId: buyerOrg.id,
        invoiceNumber: 'INV-BARAKAH-RAMADAN-001',
      },
    },
    update: {
      purchaseOrderId: purchaseOrder.id,
      supplierId: supplier.id,
      amount: 50000,
      status: 'RECORDED',
      issuedAt: fixedDate(-5),
    },
    create: {
      organizationId: buyerOrg.id,
      purchaseOrderId: purchaseOrder.id,
      supplierId: supplier.id,
      invoiceNumber: 'INV-BARAKAH-RAMADAN-001',
      amount: 50000,
      status: 'RECORDED',
      issuedAt: fixedDate(-5),
    },
  });
  const evidencePack = await ensureFirst({
    model: prisma.evidencePack,
    where: {
      organizationId: buyerOrg.id,
      title: 'Ramadan stock replenishment evidence pack',
    },
    update: {
      projectId: project.id,
      status: 'EXPORTED',
      exportedAt: fixedDate(-3),
      summary: {
        procurementChain:
          'requisition -> rfq -> quotation -> purchase order -> receipt -> invoice',
        safeForReview: true,
      },
    },
    create: {
      organizationId: buyerOrg.id,
      projectId: project.id,
      title: 'Ramadan stock replenishment evidence pack',
      status: 'EXPORTED',
      exportedAt: fixedDate(-3),
      summary: {
        procurementChain:
          'requisition -> rfq -> quotation -> purchase order -> receipt -> invoice',
        safeForReview: true,
      },
    },
  });

  await prisma.evidenceItem.deleteMany({
    where: { evidencePackId: evidencePack.id },
  });
  const evidenceItems = await Promise.all([
    createEvidenceItem(evidencePack, requisition, 'Requisition approval'),
    createEvidenceItem(evidencePack, rfq, 'Published RFQ'),
    createEvidenceItem(evidencePack, quotation, 'Supplier quotation'),
    createEvidenceItem(evidencePack, purchaseOrder, 'Issued purchase order'),
    createEvidenceItem(evidencePack, receipt, 'Accepted receipt'),
    createEvidenceItem(evidencePack, invoice, 'Supplier invoice'),
  ]);

  const hashRecord = await seedLocalHashRecord({
    organizationId: buyerOrg.id,
    entityType: 'EvidencePack',
    entityId: evidencePack.id,
    canonicalPayload: {
      evidencePackId: evidencePack.id,
      purchaseOrderNumber: purchaseOrder.poNumber,
      invoiceNumber: invoice.invoiceNumber,
      amount: invoice.amount,
      proofBoundary:
        'Local hash record only. Fabric verification remains pending/unavailable unless gateway ReadAnchor succeeds.',
    },
  });

  await seedAuditEvents(buyerOrg.id, procurementOfficer.id, [
    ['REQUISITION_APPROVED', 'Requisition', requisition.id],
    ['RFQ_PUBLISHED', 'RFQ', rfq.id],
    ['QUOTATION_ACCEPTED', 'Quotation', quotation.id],
    ['PURCHASE_ORDER_ISSUED', 'PurchaseOrder', purchaseOrder.id],
    ['RECEIPT_RECORDED', 'Receipt', receipt.id],
    ['INVOICE_RECORDED', 'Invoice', invoice.id],
    ['PAYMENT_STATUS_RECORDED', 'Invoice', invoice.id],
    ['EVIDENCE_PACK_EXPORTED', 'EvidencePack', evidencePack.id],
  ]);

  return {
    organizationId: buyerOrg.id,
    projectId: project.id,
    supplierId: supplier.id,
    requisitionId: requisition.id,
    rfqId: rfq.id,
    quotationId: quotation.id,
    purchaseOrderId: purchaseOrder.id,
    receiptId: receipt.id,
    invoiceId: invoice.id,
    evidencePackId: evidencePack.id,
    evidenceItemIds: evidenceItems.map((item) => item.id),
    localHashRecordId: hashRecord.id,
  };
}

async function seedMudarabahChain(nodes, procurement) {
  const buyerOrg = nodes.buyer.organization;
  const mudarib = nodes.supplier.users['mudarib.operator@barakah.local'];
  const investmentOfficer =
    nodes.financier.users['investment.officer@mabrur.local'];
  const shariahReviewer =
    nodes.shariah.users['shariah.reviewer@hidayah.local'];
  const evidencePack = await prisma.evidencePack.findUniqueOrThrow({
    where: { id: procurement.evidencePackId },
  });

  const opportunity = await ensureFirst({
    model: prisma.procurementOpportunity,
    where: {
      organizationId: buyerOrg.id,
      title:
        'Barakah Ramadan stock fulfilment restricted mudarabah opportunity',
    },
    update: {
      projectId: procurement.projectId,
      requisitionId: procurement.requisitionId,
      purchaseOrderId: procurement.purchaseOrderId,
      evidencePackId: evidencePack.id,
      status: 'SUBMITTED',
      estimatedCapital: 50000,
      expectedProfit: 28000,
      currency: 'MYR',
      description:
        'Revenue-generating buyer PO opportunity. Requested capital funds approved procurement execution only; no guaranteed fixed return is represented.',
    },
    create: {
      organizationId: buyerOrg.id,
      projectId: procurement.projectId,
      requisitionId: procurement.requisitionId,
      purchaseOrderId: procurement.purchaseOrderId,
      evidencePackId: evidencePack.id,
      title:
        'Barakah Ramadan stock fulfilment restricted mudarabah opportunity',
      status: 'SUBMITTED',
      estimatedCapital: 50000,
      expectedProfit: 28000,
      currency: 'MYR',
      description:
        'Revenue-generating buyer PO opportunity. Requested capital funds approved procurement execution only; no guaranteed fixed return is represented.',
    },
  });
  const application = await ensureFirst({
    model: prisma.mudarabahApplication,
    where: {
      organizationId: buyerOrg.id,
      opportunityId: opportunity.id,
      applicantUserId: mudarib.id,
    },
    update: {
      status: 'APPROVED',
      requestedCapital: 50000,
      capitalProviderRatio: 0.6,
      entrepreneurRatio: 0.4,
      currency: 'MYR',
      purpose:
        'Restricted mudarabah capital for halal packaged food stock fulfilment under Amanah Retail PO.',
      submittedAt: fixedDate(-9),
      approvedAt: fixedDate(-4),
      rejectedAt: null,
      rejectionReason: null,
    },
    create: {
      organizationId: buyerOrg.id,
      opportunityId: opportunity.id,
      applicantUserId: mudarib.id,
      status: 'APPROVED',
      requestedCapital: 50000,
      capitalProviderRatio: 0.6,
      entrepreneurRatio: 0.4,
      currency: 'MYR',
      purpose:
        'Restricted mudarabah capital for halal packaged food stock fulfilment under Amanah Retail PO.',
      submittedAt: fixedDate(-9),
      approvedAt: fixedDate(-4),
    },
  });
  const checklist = await prisma.evidenceChecklist.upsert({
    where: { applicationId: application.id },
    update: {
      organizationId: buyerOrg.id,
      status: 'COMPLETED',
    },
    create: {
      organizationId: buyerOrg.id,
      applicationId: application.id,
      status: 'COMPLETED',
    },
  });

  await prisma.evidenceChecklistItem.deleteMany({
    where: { checklistId: checklist.id },
  });
  await prisma.evidenceChecklistItem.createMany({
    data: [
      ['BUYER_DEMAND', 'Buyer demand evidence'],
      ['SUPPLIER_QUOTATION', 'Supplier quotation evidence'],
      ['COST_BUDGET', 'Cost budget evidence'],
      ['DELIVERY_TIMELINE', 'Delivery timeline evidence'],
      ['SHARIAH_ELIGIBILITY', 'Shariah eligibility evidence'],
    ].map(([requiredCode, label]) => ({
      checklistId: checklist.id,
      requiredCode,
      label,
      status: 'COMPLETED',
      completedAt: fixedDate(-8),
      metadata: {
        source: 'UAT seed',
        evidencePackId: evidencePack.id,
      },
    })),
  });

  await ensureFirst({
    model: prisma.dueDiligenceReport,
    where: {
      organizationId: buyerOrg.id,
      applicationId: application.id,
      status: 'PENDING',
    },
    update: {
      reviewerUserId: investmentOfficer.id,
      riskRating: 'MEDIUM',
      decision: null,
      notes:
        'Pending review scenario retained for queue/readiness demonstration.',
    },
    create: {
      organizationId: buyerOrg.id,
      applicationId: application.id,
      reviewerUserId: investmentOfficer.id,
      status: 'PENDING',
      riskRating: 'MEDIUM',
      notes:
        'Pending review scenario retained for queue/readiness demonstration.',
    },
  });
  await ensureFirst({
    model: prisma.dueDiligenceReport,
    where: {
      organizationId: buyerOrg.id,
      applicationId: application.id,
      status: 'APPROVED',
    },
    update: {
      reviewerUserId: investmentOfficer.id,
      riskRating: 'MEDIUM',
      decision: 'APPROVED',
      notes:
        'Approved for local/UAT demonstration based on buyer demand evidence and cost budget.',
    },
    create: {
      organizationId: buyerOrg.id,
      applicationId: application.id,
      reviewerUserId: investmentOfficer.id,
      status: 'APPROVED',
      riskRating: 'MEDIUM',
      decision: 'APPROVED',
      notes:
        'Approved for local/UAT demonstration based on buyer demand evidence and cost budget.',
    },
  });
  await ensureFirst({
    model: prisma.shariahReview,
    where: {
      organizationId: buyerOrg.id,
      applicationId: application.id,
      status: 'PENDING',
    },
    update: {
      reviewerUserId: shariahReviewer.id,
      decision: null,
      opinion:
        'Pending checklist scenario retained for reviewer queue demonstration.',
      notes: 'No fixed-return approval should be inferred from pending state.',
    },
    create: {
      organizationId: buyerOrg.id,
      applicationId: application.id,
      reviewerUserId: shariahReviewer.id,
      status: 'PENDING',
      opinion:
        'Pending checklist scenario retained for reviewer queue demonstration.',
      notes: 'No fixed-return approval should be inferred from pending state.',
    },
  });
  await ensureFirst({
    model: prisma.shariahReview,
    where: {
      organizationId: buyerOrg.id,
      applicationId: application.id,
      status: 'APPROVED',
    },
    update: {
      reviewerUserId: shariahReviewer.id,
      decision: 'APPROVED',
      opinion:
        'Goods are halal-packaged inventory; profit split is ratio-based and loss treatment remains mudarabah-compliant.',
      notes:
        'Approved for local/UAT demonstration. No guaranteed fixed return is seeded.',
    },
    create: {
      organizationId: buyerOrg.id,
      applicationId: application.id,
      reviewerUserId: shariahReviewer.id,
      status: 'APPROVED',
      decision: 'APPROVED',
      opinion:
        'Goods are halal-packaged inventory; profit split is ratio-based and loss treatment remains mudarabah-compliant.',
      notes:
        'Approved for local/UAT demonstration. No guaranteed fixed return is seeded.',
    },
  });

  const contract = await prisma.mudarabahContract.upsert({
    where: {
      organizationId_contractNumber: {
        organizationId: buyerOrg.id,
        contractNumber: 'MUD-CTR-RAMADAN-001',
      },
    },
    update: {
      applicationId: application.id,
      status: 'EXECUTED',
      restrictedUse:
        'Restricted to Amanah Ramadan halal packaged inventory fulfilment costs.',
      signedAt: fixedDate(-3),
    },
    create: {
      organizationId: buyerOrg.id,
      applicationId: application.id,
      contractNumber: 'MUD-CTR-RAMADAN-001',
      status: 'EXECUTED',
      restrictedUse:
        'Restricted to Amanah Ramadan halal packaged inventory fulfilment costs.',
      signedAt: fixedDate(-3),
    },
  });
  const disbursement = await ensureFirst({
    model: prisma.disbursement,
    where: {
      organizationId: buyerOrg.id,
      applicationId: application.id,
      reference: 'DISB-MABRUR-RAMADAN-001',
    },
    update: {
      contractId: contract.id,
      amount: 50000,
      currency: 'MYR',
      status: 'RECORDED',
      disbursedAt: fixedDate(-2),
    },
    create: {
      organizationId: buyerOrg.id,
      applicationId: application.id,
      contractId: contract.id,
      amount: 50000,
      currency: 'MYR',
      reference: 'DISB-MABRUR-RAMADAN-001',
      status: 'RECORDED',
      disbursedAt: fixedDate(-2),
    },
  });

  await prisma.projectLedgerEntry.deleteMany({
    where: {
      organizationId: buyerOrg.id,
      applicationId: application.id,
    },
  });
  await prisma.projectLedgerEntry.createMany({
    data: [
      {
        organizationId: buyerOrg.id,
        applicationId: application.id,
        entryType: 'CAPITAL',
        description: 'Mabrur restricted capital recorded',
        amount: 50000,
        currency: 'MYR',
        occurredAt: fixedDate(-2),
      },
      {
        organizationId: buyerOrg.id,
        applicationId: application.id,
        entryType: 'ALLOWABLE_COST',
        description: 'Halal stock procurement allowable cost',
        amount: -50000,
        currency: 'MYR',
        occurredAt: fixedDate(-1),
      },
      {
        organizationId: buyerOrg.id,
        applicationId: application.id,
        entryType: 'REVENUE',
        description: 'Buyer payment received for Ramadan stock',
        amount: 78000,
        currency: 'MYR',
        occurredAt: fixedDate(0),
      },
    ],
  });

  let statement = await prisma.profitLossStatement.findFirst({
    where: {
      organizationId: buyerOrg.id,
      applicationId: application.id,
      status: 'CALCULATED',
    },
  });
  const statementData = {
    organizationId: buyerOrg.id,
    applicationId: application.id,
    periodStart: fixedDate(-2),
    periodEnd: fixedDate(0),
    revenue: 78000,
    costs: 50000,
    netProfit: 28000,
    status: 'CALCULATED',
  };

  if (statement) {
    statement = await prisma.profitLossStatement.update({
      where: { id: statement.id },
      data: statementData,
    });
  } else {
    statement = await prisma.profitLossStatement.create({ data: statementData });
  }

  await prisma.profitDistribution.deleteMany({
    where: { statementId: statement.id },
  });
  await prisma.profitDistribution.createMany({
    data: [
      {
        organizationId: buyerOrg.id,
        statementId: statement.id,
        party: 'Rabb-ul-mal / Mabrur Finance Partner',
        ratio: 0.6,
        amount: 16800,
      },
      {
        organizationId: buyerOrg.id,
        statementId: statement.id,
        party: 'Mudarib / Barakah Supplies Sdn Bhd',
        ratio: 0.4,
        amount: 11200,
      },
    ],
  });

  const closure = await ensureFirst({
    model: prisma.closurePack,
    where: {
      organizationId: buyerOrg.id,
      applicationId: application.id,
      status: 'EXPORTED',
    },
    update: {
      evidencePackId: evidencePack.id,
      exportedAt: fixedDate(0),
      summary: {
        netProfit: 28000,
        ratioBasedDistribution: true,
        guaranteedFixedReturn: false,
      },
    },
    create: {
      organizationId: buyerOrg.id,
      applicationId: application.id,
      evidencePackId: evidencePack.id,
      status: 'EXPORTED',
      exportedAt: fixedDate(0),
      summary: {
        netProfit: 28000,
        ratioBasedDistribution: true,
        guaranteedFixedReturn: false,
      },
    },
  });

  await seedAuditEvents(buyerOrg.id, investmentOfficer.id, [
    ['MUDARABAH_OPPORTUNITY_SUBMITTED', 'ProcurementOpportunity', opportunity.id],
    ['MUDARABAH_APPLICATION_APPROVED', 'MudarabahApplication', application.id],
    ['DUE_DILIGENCE_APPROVED', 'MudarabahApplication', application.id],
    ['SHARIAH_REVIEW_APPROVED', 'MudarabahApplication', application.id],
    ['MUDARABAH_CONTRACT_EXECUTED', 'MudarabahContract', contract.id],
    ['DISBURSEMENT_RECORDED', 'Disbursement', disbursement.id],
    ['PROFIT_LOSS_CALCULATED', 'ProfitLossStatement', statement.id],
    ['CLOSURE_PACK_EXPORTED', 'ClosurePack', closure.id],
  ]);

  return {
    opportunityId: opportunity.id,
    applicationId: application.id,
    checklistId: checklist.id,
    contractId: contract.id,
    disbursementId: disbursement.id,
    profitLossStatementId: statement.id,
    closurePackId: closure.id,
  };
}

async function seedIntegrationEvidence(nodes, finance) {
  const buyerOrg = nodes.buyer.organization;
  const erpIntegrator = nodes.integrator.users['erp.integrator@nusantara.local'];
  const outbox = await prisma.outboxEvent.upsert({
    where: {
      idempotencyKey: `uat-erp-reconciliation-${finance.applicationId}`,
    },
    update: {
      organizationId: buyerOrg.id,
      eventType: 'ERP_SYNC_REQUESTED',
      aggregateType: 'MudarabahApplication',
      aggregateId: finance.applicationId,
      payload: {
        scenario: 'UC-15 ERP/accounting local UAT sync',
        sanitized: true,
      },
      status: 'PROCESSED',
      attempts: 1,
      processedAt: fixedDate(0),
      lastError: null,
    },
    create: {
      organizationId: buyerOrg.id,
      eventType: 'ERP_SYNC_REQUESTED',
      aggregateType: 'MudarabahApplication',
      aggregateId: finance.applicationId,
      payload: {
        scenario: 'UC-15 ERP/accounting local UAT sync',
        sanitized: true,
      },
      status: 'PROCESSED',
      attempts: 1,
      processedAt: fixedDate(0),
      idempotencyKey: `uat-erp-reconciliation-${finance.applicationId}`,
    },
  });

  const reconciliation = await prisma.integrationReconciliationRecord.upsert({
    where: { outboxEventId: outbox.id },
    update: {
      organizationId: buyerOrg.id,
      integrationType: 'ERP',
      aggregateType: 'MudarabahApplication',
      aggregateId: finance.applicationId,
      externalReference: 'ERP-UAT-RAMADAN-001',
      status: 'MATCHED',
      requestPayload: {
        sanitized: true,
        idempotencyKey: outbox.idempotencyKey,
      },
      responsePayload: {
        sanitized: true,
        postingStatus: 'accepted',
      },
      lastError: null,
      attempts: 1,
    },
    create: {
      organizationId: buyerOrg.id,
      outboxEventId: outbox.id,
      integrationType: 'ERP',
      aggregateType: 'MudarabahApplication',
      aggregateId: finance.applicationId,
      externalReference: 'ERP-UAT-RAMADAN-001',
      status: 'MATCHED',
      requestPayload: {
        sanitized: true,
        idempotencyKey: outbox.idempotencyKey,
      },
      responsePayload: {
        sanitized: true,
        postingStatus: 'accepted',
      },
      attempts: 1,
    },
  });

  await seedAuditEvents(buyerOrg.id, erpIntegrator.id, [
    ['ERP_RECONCILIATION_MATCHED', 'IntegrationReconciliationRecord', reconciliation.id],
  ]);

  return {
    outboxEventId: outbox.id,
    reconciliationRecordId: reconciliation.id,
  };
}

async function seedFabricGovernanceReadiness(nodes) {
  const operatorOrg = nodes.platform.organization;
  const buyerOrg = nodes.buyer.organization;
  const supplierOrg = nodes.supplier.organization;
  const financierOrg = nodes.financier.organization;
  const fabricOperator = nodes.platform.users['fabric.operator@mepn.local'];
  const network = await ensureFirst({
    model: prisma.fabricNetwork,
    where: {
      name: 'MEPN Local Operator-Assisted Demo Network',
    },
    update: {
      environment: 'local',
      governanceModel: 'operator_assisted',
      operatorOrganizationId: operatorOrg.id,
      status: 'draft',
    },
    create: {
      name: 'MEPN Local Operator-Assisted Demo Network',
      environment: 'local',
      governanceModel: 'operator_assisted',
      operatorOrganizationId: operatorOrg.id,
      status: 'draft',
    },
  });
  const channel = await prisma.fabricChannel.upsert({
    where: {
      fabricNetworkId_channelName: {
        fabricNetworkId: network.id,
        channelName: 'mepn-ramadan-demo',
      },
    },
    update: {
      chaincodeName: 'audit-anchor',
      status: 'proposed',
      createdByOrganizationId: buyerOrg.id,
      readinessStatus: 'operator_pending',
      operatorVerifiedAt: null,
    },
    create: {
      fabricNetworkId: network.id,
      channelName: 'mepn-ramadan-demo',
      chaincodeName: 'audit-anchor',
      status: 'proposed',
      createdByOrganizationId: buyerOrg.id,
      readinessStatus: 'operator_pending',
    },
  });

  for (const organization of [buyerOrg, supplierOrg, financierOrg]) {
    await prisma.fabricChannelMembership.upsert({
      where: {
        fabricChannelId_organizationId: {
          fabricChannelId: channel.id,
          organizationId: organization.id,
        },
      },
      update: {
        membershipStatus: 'invited',
        joinedAt: null,
        mspId: `${organization.legalName.replace(/\W+/g, '')}MSP`,
      },
      create: {
        fabricChannelId: channel.id,
        organizationId: organization.id,
        membershipStatus: 'invited',
        joinedAt: null,
        mspId: `${organization.legalName.replace(/\W+/g, '')}MSP`,
      },
    });
  }

  const proposalDigest = sha256({
    channelName: channel.channelName,
    proposalType: 'CHANNEL_JOIN_PACKAGE_IMPORT',
    boundary: 'operator-assisted-readiness-only',
  });
  const proposal = await ensureFirst({
    model: prisma.fabricChannelProposal,
    where: {
      fabricChannelId: channel.id,
      proposalType: 'CHANNEL_JOIN_PACKAGE_IMPORT',
      proposalDigest,
    },
    update: {
      status: 'pending_approval',
      proposalPayload: {
        packageVersion: 'uat-v1',
        containsAdminPrivateKeys: false,
        requiredOperatorAction: true,
        boundary:
          'No direct API channel creation, peer join, MSP enrollment, or topology mutation.',
      },
      requiredApprovals: 2,
      createdByUserId: fabricOperator.id,
      operatorUserId: fabricOperator.id,
      executedAt: null,
      failureReason: null,
    },
    create: {
      fabricChannelId: channel.id,
      proposalType: 'CHANNEL_JOIN_PACKAGE_IMPORT',
      proposalDigest,
      status: 'pending_approval',
      proposalPayload: {
        packageVersion: 'uat-v1',
        containsAdminPrivateKeys: false,
        requiredOperatorAction: true,
        boundary:
          'No direct API channel creation, peer join, MSP enrollment, or topology mutation.',
      },
      requiredApprovals: 2,
      createdByUserId: fabricOperator.id,
      operatorUserId: fabricOperator.id,
    },
  });

  return {
    networkId: network.id,
    channelId: channel.id,
    proposalId: proposal.id,
    readinessStatus: channel.readinessStatus,
    topologyMutation: 'not implemented',
  };
}

async function createEvidenceItem(evidencePack, entity, label) {
  return prisma.evidenceItem.create({
    data: {
      organizationId: evidencePack.organizationId,
      evidencePackId: evidencePack.id,
      entityType: entityModelName(entity),
      entityId: entity.id,
      label,
      evidenceType: 'UAT_DOCUMENT_REFERENCE',
      metadata: {
        seeded: true,
        storage: 'local metadata only',
      },
    },
  });
}

async function seedLocalHashRecord({
  organizationId,
  entityType,
  entityId,
  canonicalPayload,
}) {
  const canonicalText = JSON.stringify(canonicalPayload);
  const canonicalHash = sha256(canonicalText);
  let record = await prisma.hashRecord.findFirst({
    where: {
      organizationId,
      entityType,
      entityId,
    },
  });
  const data = {
    organizationId,
    entityType,
    entityId,
    canonicalHash,
    canonicalJson: canonicalPayload,
    canonicalText,
    verifiedAt: null,
  };

  if (record) {
    record = await prisma.hashRecord.update({
      where: { id: record.id },
      data,
    });
  } else {
    record = await prisma.hashRecord.create({ data });
  }

  await ensureFirst({
    model: prisma.auditAnchor,
    where: {
      organizationId,
      rootHash: canonicalHash,
      anchorType: 'LOCAL',
    },
    update: {
      status: 'PENDING',
      metadata: {
        seeded: true,
        note: 'Local pending anchor metadata. Not real Fabric proof.',
      },
      anchoredAt: null,
      fabricTransactionId: null,
      fabricBlockNumber: null,
      fabricChannel: null,
      fabricChaincode: null,
      fabricCommitStatus: null,
      fabricEndorsementStatus: null,
      fabricVerifiedAt: null,
    },
    create: {
      organizationId,
      rootHash: canonicalHash,
      anchorType: 'LOCAL',
      status: 'PENDING',
      metadata: {
        seeded: true,
        note: 'Local pending anchor metadata. Not real Fabric proof.',
      },
    },
  });

  return record;
}

async function seedAuditEvents(organizationId, actorUserId, events) {
  for (const [eventType, entityType, entityId] of events) {
    const correlationId = `uat-${eventType}-${entityId}`;
    const existing = await prisma.auditEvent.findFirst({
      where: { correlationId },
    });
    const data = {
      organizationId,
      actorUserId,
      eventType,
      entityType,
      entityId,
      correlationId,
      metadata: {
        seeded: true,
        safeForEvidence: true,
      },
    };

    if (existing) {
      await prisma.auditEvent.update({
        where: { id: existing.id },
        data,
      });
    } else {
      await prisma.auditEvent.create({ data });
    }
  }
}

async function ensureFirst({ model, where, create, update }) {
  const existing = await model.findFirst({ where });

  if (existing) {
    return model.update({
      where: { id: existing.id },
      data: update,
    });
  }

  return model.create({ data: create });
}

function displayName(code) {
  return code
    .replace(/[:_]/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (value) => value.toUpperCase());
}

function fixedDate(offsetDays) {
  const value = new Date('2026-06-01T09:00:00.000Z');
  value.setUTCDate(value.getUTCDate() + offsetDays);
  return value;
}

function sha256(value) {
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  return createHash('sha256').update(text).digest('hex');
}

function entityModelName(entity) {
  if ('poNumber' in entity) {
    return 'PurchaseOrder';
  }

  if ('invoiceNumber' in entity) {
    return 'Invoice';
  }

  if ('receivedAt' in entity && 'supplierId' in entity) {
    return 'Quotation';
  }

  if ('receivedAt' in entity) {
    return 'Receipt';
  }

  if ('publishedAt' in entity) {
    return 'RFQ';
  }

  return 'Requisition';
}

function redactDatabaseUrl(value) {
  if (!value) {
    return null;
  }

  try {
    const parsed = new URL(value);

    if (parsed.password) {
      parsed.password = '<redacted>';
    }

    return parsed.toString();
  } catch {
    return '<redacted>';
  }
}
