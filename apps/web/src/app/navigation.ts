import type {
  AppPermission,
  AppRoleCode,
  DeploymentMode,
} from '../shared/types'

export type AppModule =
  | 'Dashboard'
  | 'Organization'
  | 'Identity & Access'
  | 'Procurement'
  | 'Evidence'
  | 'Audit'
  | 'Finance'
  | 'Graph/Canvas'
  | 'Integrations'
  | 'Operations'
  | 'Administration'
  | 'Reports'
  | 'Review Package'

export type AppRouteMetadata = {
  path: string
  label: string
  module: AppModule
  requiredPermissions: AppPermission[]
  requiredAnyPermissions?: AppPermission[]
  requiredOrganizationContext: boolean
  showInSidebar: boolean
  requiredRoleCodes?: AppRoleCode[]
  deploymentModes?: DeploymentMode[]
  allowAnonymous?: boolean
}

const smeNodeModes: DeploymentMode[] = ['standalone_sme']
const financeNodeModes: DeploymentMode[] = [
  'standalone_sme',
  'financial_entity_node',
  'hosted_financier_portal',
]
const selfHostedNodeModes: DeploymentMode[] = [
  'standalone_sme',
  'financial_entity_node',
  'fabric_organization',
]

const procurementActorRoles: AppRoleCode[] = [
  'ORG_ADMIN',
  'PROCUREMENT_OFFICER',
  'RECEIVING_OFFICER',
]

const procurementReviewerRoles: AppRoleCode[] = [
  'ORG_ADMIN',
  'APPROVER',
  'APPROVER_MANAGER',
]

const supplierActorRoles: AppRoleCode[] = [
  'SUPPLIER_USER',
  'SUPPLIER_SALES',
  'MUDARIB_OPERATOR',
  'SUPPLIER_FINANCE',
  'EVIDENCE_SUBMITTER',
]

const financeReviewerRoles: AppRoleCode[] = [
  'ORG_ADMIN',
  'FINANCE_ACCOUNTANT',
  'FINANCIER_USER',
  'INVESTMENT_OFFICER',
  'RISK_REVIEWER',
  'DISBURSEMENT_OFFICER',
]

const complianceReviewerRoles: AppRoleCode[] = [
  'SHARIAH_REVIEWER',
  'COMPLIANCE_REVIEWER',
  'CONTRACT_REVIEWER',
]

const auditReaderRoles: AppRoleCode[] = [
  'ORG_ADMIN',
  'AUDITOR',
  'AUDIT_VIEWER',
  'FINANCIER_AUDIT_VIEWER',
  'REGULATOR_REVIEWER',
  'READ_ONLY_EVIDENCE_VIEWER',
]

const integrationOperatorRoles: AppRoleCode[] = [
  'ORG_ADMIN',
  'DEVELOPER_INTEGRATOR',
  'ERP_INTEGRATOR',
  'API_CLIENT_MANAGER',
  'PLATFORM_OPERATOR',
  'FABRIC_OPERATOR',
  'SUPPORT_OPERATOR',
  'SECURITY_OPERATOR',
]

export const routeMetadata: readonly AppRouteMetadata[] = [
  {
    path: '/login',
    label: 'Sign in',
    module: 'Administration',
    requiredPermissions: [],
    requiredOrganizationContext: false,
    showInSidebar: false,
    allowAnonymous: true,
  },
  {
    path: '/auth/invitations/accept',
    label: 'Accept invitation',
    module: 'Administration',
    requiredPermissions: [],
    requiredOrganizationContext: false,
    showInSidebar: false,
    allowAnonymous: true,
  },
  {
    path: '/dashboard',
    label: 'Dashboard',
    module: 'Dashboard',
    requiredPermissions: [],
    requiredOrganizationContext: true,
    showInSidebar: true,
  },
  {
    path: '/account/profile',
    label: 'Account profile',
    module: 'Identity & Access',
    requiredPermissions: [],
    requiredOrganizationContext: true,
    showInSidebar: false,
  },
  {
    path: '/inbox',
    label: 'Inbox',
    module: 'Identity & Access',
    requiredPermissions: [],
    requiredOrganizationContext: true,
    showInSidebar: false,
  },
  {
    path: '/org/setup',
    label: 'Organization',
    module: 'Organization',
    requiredPermissions: ['users:create'],
    requiredOrganizationContext: false,
    showInSidebar: false,
    requiredRoleCodes: ['ORG_ADMIN'],
    allowAnonymous: true,
  },
  {
    path: '/organization/profile',
    label: 'Profile',
    module: 'Organization',
    requiredPermissions: ['users:create'],
    requiredOrganizationContext: true,
    showInSidebar: true,
    requiredRoleCodes: ['ORG_ADMIN'],
  },
  {
    path: '/admin/users',
    label: 'Users',
    module: 'Identity & Access',
    requiredPermissions: ['users:create'],
    requiredOrganizationContext: true,
    showInSidebar: true,
    requiredRoleCodes: ['ORG_ADMIN'],
  },
  {
    path: '/admin/roles',
    label: 'Roles',
    module: 'Identity & Access',
    requiredPermissions: ['users:create'],
    requiredOrganizationContext: true,
    showInSidebar: true,
    requiredRoleCodes: ['ORG_ADMIN'],
  },
  {
    path: '/procurement',
    label: 'Procurement Workflow',
    module: 'Procurement',
    requiredPermissions: ['procurement:create'],
    requiredOrganizationContext: true,
    showInSidebar: false,
    deploymentModes: smeNodeModes,
    requiredRoleCodes: procurementActorRoles,
  },
  {
    path: '/procurement/projects',
    label: 'Projects',
    module: 'Procurement',
    requiredPermissions: ['procurement:create'],
    requiredOrganizationContext: true,
    showInSidebar: true,
    deploymentModes: smeNodeModes,
  },
  {
    path: '/procurement/suppliers',
    label: 'Suppliers',
    module: 'Procurement',
    requiredPermissions: ['procurement:create'],
    requiredOrganizationContext: true,
    showInSidebar: true,
    deploymentModes: smeNodeModes,
  },
  {
    path: '/procurement/suppliers/:id',
    label: 'Supplier Detail',
    module: 'Procurement',
    requiredPermissions: ['procurement:create'],
    requiredOrganizationContext: true,
    showInSidebar: false,
    deploymentModes: smeNodeModes,
    requiredRoleCodes: procurementActorRoles,
  },
  {
    path: '/procurement/requisitions',
    label: 'Requisitions',
    module: 'Procurement',
    requiredPermissions: ['procurement:create'],
    requiredOrganizationContext: true,
    showInSidebar: true,
    deploymentModes: smeNodeModes,
  },
  {
    path: '/procurement/requisitions/:id',
    label: 'Requisition Detail',
    module: 'Procurement',
    requiredPermissions: [],
    requiredOrganizationContext: true,
    showInSidebar: false,
    deploymentModes: smeNodeModes,
    requiredRoleCodes: [
      ...procurementActorRoles,
      ...procurementReviewerRoles,
    ],
  },
  {
    path: '/procurement/requisitions/new',
    label: 'New requisition',
    module: 'Procurement',
    requiredPermissions: ['procurement:create'],
    requiredOrganizationContext: true,
    showInSidebar: false,
    deploymentModes: smeNodeModes,
  },
  {
    path: '/procurement/approvals',
    label: 'Approvals',
    module: 'Procurement',
    requiredPermissions: ['procurement:approve'],
    requiredOrganizationContext: true,
    showInSidebar: true,
    deploymentModes: smeNodeModes,
    requiredRoleCodes: procurementReviewerRoles,
  },
  {
    path: '/procurement/approval-rules',
    label: 'Approval Rules',
    module: 'Procurement',
    requiredPermissions: ['procurement:approve'],
    requiredOrganizationContext: true,
    showInSidebar: true,
    deploymentModes: smeNodeModes,
    requiredRoleCodes: ['ORG_ADMIN'],
  },
  {
    path: '/procurement/rfqs',
    label: 'RFQs',
    module: 'Procurement',
    requiredPermissions: ['procurement:create'],
    requiredOrganizationContext: true,
    showInSidebar: true,
    deploymentModes: smeNodeModes,
  },
  {
    path: '/procurement/rfqs/:id',
    label: 'RFQ Detail',
    module: 'Procurement',
    requiredPermissions: ['procurement:create'],
    requiredOrganizationContext: true,
    showInSidebar: false,
    deploymentModes: smeNodeModes,
    requiredRoleCodes: procurementActorRoles,
  },
  {
    path: '/procurement/quotations',
    label: 'Quotations',
    module: 'Procurement',
    requiredPermissions: ['procurement:create'],
    requiredOrganizationContext: true,
    showInSidebar: true,
    deploymentModes: smeNodeModes,
  },
  {
    path: '/procurement/quotations/compare',
    label: 'Quotation Compare',
    module: 'Procurement',
    requiredPermissions: ['procurement:create'],
    requiredOrganizationContext: true,
    showInSidebar: true,
    deploymentModes: smeNodeModes,
    requiredRoleCodes: procurementActorRoles,
  },
  {
    path: '/procurement/purchase-orders',
    label: 'Purchase Orders',
    module: 'Procurement',
    requiredPermissions: ['procurement:create'],
    requiredOrganizationContext: true,
    showInSidebar: true,
    deploymentModes: smeNodeModes,
  },
  {
    path: '/procurement/purchase-orders/:id',
    label: 'Purchase Order Detail',
    module: 'Procurement',
    requiredPermissions: ['procurement:create'],
    requiredOrganizationContext: true,
    showInSidebar: false,
    deploymentModes: smeNodeModes,
    requiredRoleCodes: procurementActorRoles,
  },
  {
    path: '/procurement/receipts',
    label: 'Receipts',
    module: 'Procurement',
    requiredPermissions: ['procurement:create'],
    requiredOrganizationContext: true,
    showInSidebar: true,
    deploymentModes: smeNodeModes,
  },
  {
    path: '/procurement/matching',
    label: 'Receipt/Invoice Matching',
    module: 'Procurement',
    requiredPermissions: ['procurement:create'],
    requiredOrganizationContext: true,
    showInSidebar: true,
    deploymentModes: smeNodeModes,
    requiredRoleCodes: procurementActorRoles,
  },
  {
    path: '/procurement/invoices',
    label: 'Invoices',
    module: 'Procurement',
    requiredPermissions: ['procurement:create'],
    requiredOrganizationContext: true,
    showInSidebar: true,
    deploymentModes: smeNodeModes,
  },
  {
    path: '/evidence/documents',
    label: 'Documents',
    module: 'Evidence',
    requiredPermissions: ['procurement:create'],
    requiredOrganizationContext: true,
    showInSidebar: true,
    deploymentModes: smeNodeModes,
    requiredRoleCodes: procurementActorRoles,
  },
  {
    path: '/evidence/documents/:id',
    label: 'Document Detail',
    module: 'Evidence',
    requiredPermissions: ['audit:read'],
    requiredOrganizationContext: true,
    showInSidebar: false,
    requiredRoleCodes: [
      ...procurementActorRoles,
      ...auditReaderRoles,
    ],
  },
  {
    path: '/evidence/items',
    label: 'Evidence Items',
    module: 'Evidence',
    requiredPermissions: ['procurement:create'],
    requiredOrganizationContext: true,
    showInSidebar: true,
    deploymentModes: smeNodeModes,
    requiredRoleCodes: [
      ...procurementActorRoles,
      ...supplierActorRoles,
    ],
  },
  {
    path: '/evidence/packs',
    label: 'Evidence Packs',
    module: 'Evidence',
    requiredPermissions: ['audit:read'],
    requiredOrganizationContext: true,
    showInSidebar: true,
    requiredRoleCodes: [
      ...procurementActorRoles,
      ...supplierActorRoles,
      ...financeReviewerRoles,
      ...auditReaderRoles,
    ],
  },
  {
    path: '/evidence/packs/:id',
    label: 'Evidence Pack Detail',
    module: 'Evidence',
    requiredPermissions: ['audit:read'],
    requiredOrganizationContext: true,
    showInSidebar: false,
    requiredRoleCodes: [
      ...procurementActorRoles,
      ...supplierActorRoles,
      ...financeReviewerRoles,
      ...auditReaderRoles,
    ],
  },
  {
    path: '/evidence/packs/:id/export',
    label: 'Evidence Pack Export',
    module: 'Evidence',
    requiredPermissions: ['audit:read'],
    requiredOrganizationContext: true,
    showInSidebar: false,
    requiredRoleCodes: [
      ...procurementActorRoles,
      ...supplierActorRoles,
      ...financeReviewerRoles,
      ...auditReaderRoles,
    ],
  },
  {
    path: '/evidence/hashes',
    label: 'Hash Verification',
    module: 'Evidence',
    requiredPermissions: ['audit:read'],
    requiredOrganizationContext: true,
    showInSidebar: true,
    requiredRoleCodes: auditReaderRoles,
  },
  {
    path: '/evidence/hashes/:id',
    label: 'Hash Detail',
    module: 'Evidence',
    requiredPermissions: ['audit:read'],
    requiredOrganizationContext: true,
    showInSidebar: false,
    requiredRoleCodes: auditReaderRoles,
  },
  {
    path: '/evidence/timeline',
    label: 'Audit Timeline',
    module: 'Evidence',
    requiredPermissions: ['audit:read'],
    requiredOrganizationContext: true,
    showInSidebar: true,
    requiredRoleCodes: [
      ...procurementActorRoles,
      ...supplierActorRoles,
      ...financeReviewerRoles,
      ...complianceReviewerRoles,
      ...auditReaderRoles,
    ],
  },
  {
    path: '/audit',
    label: 'Audit Events',
    module: 'Audit',
    requiredPermissions: ['audit:read'],
    requiredOrganizationContext: true,
    showInSidebar: true,
    requiredRoleCodes: auditReaderRoles,
  },
  {
    path: '/audit/entity/:entityType/:entityId',
    label: 'Entity Audit Timeline',
    module: 'Audit',
    requiredPermissions: ['audit:read'],
    requiredOrganizationContext: true,
    showInSidebar: false,
    requiredRoleCodes: [
      ...procurementActorRoles,
      ...supplierActorRoles,
      ...financeReviewerRoles,
      ...complianceReviewerRoles,
      ...auditReaderRoles,
    ],
  },
  {
    path: '/audit/search',
    label: 'Audit Search',
    module: 'Audit',
    requiredPermissions: ['audit:read'],
    requiredOrganizationContext: true,
    showInSidebar: true,
    requiredRoleCodes: auditReaderRoles,
  },
  {
    path: '/finance/opportunities',
    label: 'Finance Opportunities',
    module: 'Finance',
    requiredPermissions: [],
    requiredOrganizationContext: true,
    showInSidebar: true,
    deploymentModes: financeNodeModes,
    requiredRoleCodes: [
      ...supplierActorRoles,
      ...financeReviewerRoles,
    ],
  },
  {
    path: '/finance/opportunities/new',
    label: 'New finance opportunity',
    module: 'Finance',
    requiredPermissions: [],
    requiredOrganizationContext: true,
    showInSidebar: false,
    deploymentModes: smeNodeModes,
    requiredRoleCodes: [
      'ORG_ADMIN',
      'MUDARIB_OPERATOR',
      'SUPPLIER_FINANCE',
    ],
  },
  {
    path: '/finance/applications',
    label: 'Applications',
    module: 'Finance',
    requiredPermissions: [],
    requiredAnyPermissions: [
      'procurement:create',
      'finance:review',
      'shariah:review',
      'audit:read',
    ],
    requiredOrganizationContext: true,
    showInSidebar: true,
    deploymentModes: financeNodeModes,
    requiredRoleCodes: [
      ...procurementActorRoles,
      ...supplierActorRoles,
      ...financeReviewerRoles,
      ...complianceReviewerRoles,
    ],
  },
  {
    path: '/finance/applications/:applicationId',
    label: 'Application workspace',
    module: 'Finance',
    requiredPermissions: [],
    requiredAnyPermissions: [
      'procurement:create',
      'finance:review',
      'shariah:review',
      'audit:read',
    ],
    requiredOrganizationContext: true,
    showInSidebar: false,
    deploymentModes: financeNodeModes,
    requiredRoleCodes: [
      ...procurementActorRoles,
      ...supplierActorRoles,
      ...financeReviewerRoles,
      ...complianceReviewerRoles,
      ...auditReaderRoles,
    ],
  },
  {
    path: '/finance/applications/:applicationId/:workspaceTab',
    label: 'Application workspace tab',
    module: 'Finance',
    requiredPermissions: [],
    requiredAnyPermissions: [
      'procurement:create',
      'finance:review',
      'shariah:review',
      'audit:read',
    ],
    requiredOrganizationContext: true,
    showInSidebar: false,
    deploymentModes: financeNodeModes,
    requiredRoleCodes: [
      ...procurementActorRoles,
      ...supplierActorRoles,
      ...financeReviewerRoles,
      ...complianceReviewerRoles,
      ...auditReaderRoles,
    ],
  },
  {
    path: '/finance/contracts',
    label: 'Contract Terms',
    module: 'Finance',
    requiredPermissions: [],
    requiredAnyPermissions: ['finance:review', 'shariah:review'],
    requiredOrganizationContext: true,
    showInSidebar: true,
    deploymentModes: financeNodeModes,
    requiredRoleCodes: [
      ...financeReviewerRoles,
      ...complianceReviewerRoles,
    ],
  },
  {
    path: '/finance/ledgers',
    label: 'Ledgers',
    module: 'Finance',
    requiredPermissions: ['finance:review'],
    requiredOrganizationContext: true,
    showInSidebar: true,
    deploymentModes: financeNodeModes,
    requiredRoleCodes: financeReviewerRoles,
  },
  {
    path: '/finance/profit-loss',
    label: 'Profit/Loss',
    module: 'Finance',
    requiredPermissions: ['finance:review'],
    requiredOrganizationContext: true,
    showInSidebar: true,
    deploymentModes: financeNodeModes,
    requiredRoleCodes: financeReviewerRoles,
  },
  {
    path: '/finance/closures',
    label: 'Closure Packs',
    module: 'Finance',
    requiredPermissions: [],
    requiredAnyPermissions: ['finance:review', 'audit:read'],
    requiredOrganizationContext: true,
    showInSidebar: true,
    deploymentModes: financeNodeModes,
    requiredRoleCodes: [
      ...financeReviewerRoles,
      ...auditReaderRoles,
    ],
  },
  {
    path: '/graph/projects',
    label: 'Network Canvas',
    module: 'Graph/Canvas',
    requiredPermissions: [],
    requiredOrganizationContext: true,
    showInSidebar: true,
    requiredRoleCodes: [
      ...procurementActorRoles,
      ...supplierActorRoles,
      ...financeReviewerRoles,
      ...complianceReviewerRoles,
      ...auditReaderRoles,
    ],
  },
  {
    path: '/integrations',
    label: 'Integrations',
    module: 'Integrations',
    requiredPermissions: [],
    requiredOrganizationContext: true,
    showInSidebar: true,
    deploymentModes: selfHostedNodeModes,
    requiredRoleCodes: [
      ...procurementActorRoles,
      ...financeReviewerRoles,
      ...auditReaderRoles,
      ...integrationOperatorRoles,
    ],
  },
  {
    path: '/fabric-governance',
    label: 'Fabric Governance',
    module: 'Integrations',
    requiredPermissions: [],
    requiredAnyPermissions: ['fabric:governance', 'fabric:operate'],
    requiredOrganizationContext: true,
    showInSidebar: true,
    deploymentModes: ['fabric_organization'],
    requiredRoleCodes: [
      'ORG_ADMIN',
      'FABRIC_GOVERNANCE_ADMIN',
      'PLATFORM_OPERATOR',
      'FABRIC_OPERATOR',
      ...auditReaderRoles,
    ],
  },
  {
    path: '/operations',
    label: 'Operations Health',
    module: 'Operations',
    requiredPermissions: [],
    requiredOrganizationContext: true,
    showInSidebar: true,
    deploymentModes: selfHostedNodeModes,
    requiredRoleCodes: [
      ...integrationOperatorRoles,
      ...auditReaderRoles,
    ],
  },
  {
    path: '/operations/health',
    label: 'Operations Health Detail',
    module: 'Operations',
    requiredPermissions: [],
    requiredOrganizationContext: true,
    showInSidebar: false,
    deploymentModes: selfHostedNodeModes,
    requiredRoleCodes: [
      ...integrationOperatorRoles,
      ...auditReaderRoles,
    ],
  },
  {
    path: '/reports',
    label: 'Reports',
    module: 'Reports',
    requiredPermissions: [],
    requiredOrganizationContext: true,
    showInSidebar: true,
    requiredRoleCodes: [
      ...financeReviewerRoles,
      ...auditReaderRoles,
      ...integrationOperatorRoles,
    ],
  },
  {
    path: '/evidence-package',
    label: 'Evidence Package',
    module: 'Review Package',
    requiredPermissions: [],
    requiredOrganizationContext: true,
    showInSidebar: true,
    requiredRoleCodes: [
      ...financeReviewerRoles,
      ...complianceReviewerRoles,
      ...auditReaderRoles,
      ...integrationOperatorRoles,
    ],
  },
] as const

export function matchRouteMetadata(pathname: string) {
  const normalizedPath = normalizePath(pathname)

  const exactRoute = routeMetadata.find(
    (route) => !route.path.includes(':') && route.path === normalizedPath,
  )

  if (exactRoute) {
    return exactRoute
  }

  return routeMetadata.find((route) => {
    if (!route.path.includes(':')) {
      return false
    }

    const pattern = new RegExp(
      `^${route.path.replace(/:[^/]+/g, '[^/]+')}$`,
    )
    return pattern.test(normalizedPath)
  })
}

function normalizePath(pathname: string) {
  if (pathname.length > 1 && pathname.endsWith('/')) {
    return pathname.slice(0, -1)
  }

  return pathname
}
