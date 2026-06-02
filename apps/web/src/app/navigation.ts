import type { AppPermission, AppRoleCode } from '../shared/types'

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
  | 'Administration'

export type AppRouteMetadata = {
  path: string
  label: string
  module: AppModule
  requiredPermissions: AppPermission[]
  requiredOrganizationContext: boolean
  showInSidebar: boolean
  requiredRoleCodes?: AppRoleCode[]
  allowAnonymous?: boolean
}

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
    path: '/dashboard',
    label: 'Dashboard',
    module: 'Dashboard',
    requiredPermissions: [],
    requiredOrganizationContext: false,
    showInSidebar: true,
    allowAnonymous: true,
  },
  {
    path: '/org/setup',
    label: 'Organization',
    module: 'Organization',
    requiredPermissions: ['users:create'],
    requiredOrganizationContext: false,
    showInSidebar: true,
    requiredRoleCodes: ['ORG_ADMIN'],
    allowAnonymous: true,
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
    path: '/procurement/projects',
    label: 'Projects',
    module: 'Procurement',
    requiredPermissions: ['procurement:create'],
    requiredOrganizationContext: true,
    showInSidebar: true,
  },
  {
    path: '/procurement/suppliers',
    label: 'Suppliers',
    module: 'Procurement',
    requiredPermissions: ['procurement:create'],
    requiredOrganizationContext: true,
    showInSidebar: true,
  },
  {
    path: '/procurement/suppliers/:id',
    label: 'Supplier Detail',
    module: 'Procurement',
    requiredPermissions: ['procurement:create'],
    requiredOrganizationContext: true,
    showInSidebar: false,
    requiredRoleCodes: ['ORG_ADMIN', 'PROCUREMENT_OFFICER'],
  },
  {
    path: '/procurement/requisitions',
    label: 'Requisitions',
    module: 'Procurement',
    requiredPermissions: ['procurement:create'],
    requiredOrganizationContext: true,
    showInSidebar: true,
  },
  {
    path: '/procurement/requisitions/:id',
    label: 'Requisition Detail',
    module: 'Procurement',
    requiredPermissions: [],
    requiredOrganizationContext: true,
    showInSidebar: false,
    requiredRoleCodes: ['ORG_ADMIN', 'PROCUREMENT_OFFICER', 'APPROVER'],
  },
  {
    path: '/procurement/requisitions/new',
    label: 'New requisition',
    module: 'Procurement',
    requiredPermissions: ['procurement:create'],
    requiredOrganizationContext: true,
    showInSidebar: false,
  },
  {
    path: '/procurement/approvals',
    label: 'Approvals',
    module: 'Procurement',
    requiredPermissions: ['procurement:approve'],
    requiredOrganizationContext: true,
    showInSidebar: true,
    requiredRoleCodes: ['ORG_ADMIN', 'APPROVER'],
  },
  {
    path: '/procurement/approval-rules',
    label: 'Approval Rules',
    module: 'Procurement',
    requiredPermissions: ['procurement:approve'],
    requiredOrganizationContext: true,
    showInSidebar: true,
    requiredRoleCodes: ['ORG_ADMIN'],
  },
  {
    path: '/procurement/rfqs',
    label: 'RFQs',
    module: 'Procurement',
    requiredPermissions: ['procurement:create'],
    requiredOrganizationContext: true,
    showInSidebar: true,
  },
  {
    path: '/procurement/rfqs/:id',
    label: 'RFQ Detail',
    module: 'Procurement',
    requiredPermissions: ['procurement:create'],
    requiredOrganizationContext: true,
    showInSidebar: false,
    requiredRoleCodes: ['ORG_ADMIN', 'PROCUREMENT_OFFICER'],
  },
  {
    path: '/procurement/quotations',
    label: 'Quotations',
    module: 'Procurement',
    requiredPermissions: ['procurement:create'],
    requiredOrganizationContext: true,
    showInSidebar: true,
  },
  {
    path: '/procurement/quotations/compare',
    label: 'Quotation Compare',
    module: 'Procurement',
    requiredPermissions: ['procurement:create'],
    requiredOrganizationContext: true,
    showInSidebar: true,
    requiredRoleCodes: ['ORG_ADMIN', 'PROCUREMENT_OFFICER'],
  },
  {
    path: '/procurement/purchase-orders',
    label: 'Purchase Orders',
    module: 'Procurement',
    requiredPermissions: ['procurement:create'],
    requiredOrganizationContext: true,
    showInSidebar: true,
  },
  {
    path: '/procurement/purchase-orders/:id',
    label: 'Purchase Order Detail',
    module: 'Procurement',
    requiredPermissions: ['procurement:create'],
    requiredOrganizationContext: true,
    showInSidebar: false,
    requiredRoleCodes: ['ORG_ADMIN', 'PROCUREMENT_OFFICER'],
  },
  {
    path: '/procurement/receipts',
    label: 'Receipts',
    module: 'Procurement',
    requiredPermissions: ['procurement:create'],
    requiredOrganizationContext: true,
    showInSidebar: true,
  },
  {
    path: '/procurement/matching',
    label: 'Receipt/Invoice Matching',
    module: 'Procurement',
    requiredPermissions: ['procurement:create'],
    requiredOrganizationContext: true,
    showInSidebar: true,
    requiredRoleCodes: ['ORG_ADMIN', 'PROCUREMENT_OFFICER'],
  },
  {
    path: '/procurement/invoices',
    label: 'Invoices',
    module: 'Procurement',
    requiredPermissions: ['procurement:create'],
    requiredOrganizationContext: true,
    showInSidebar: true,
  },
  {
    path: '/evidence/documents',
    label: 'Documents',
    module: 'Evidence',
    requiredPermissions: ['procurement:create'],
    requiredOrganizationContext: true,
    showInSidebar: true,
    requiredRoleCodes: ['ORG_ADMIN', 'PROCUREMENT_OFFICER'],
  },
  {
    path: '/evidence/documents/:id',
    label: 'Document Detail',
    module: 'Evidence',
    requiredPermissions: ['audit:read'],
    requiredOrganizationContext: true,
    showInSidebar: false,
    requiredRoleCodes: ['ORG_ADMIN', 'PROCUREMENT_OFFICER', 'AUDITOR'],
  },
  {
    path: '/evidence/items',
    label: 'Evidence Items',
    module: 'Evidence',
    requiredPermissions: ['procurement:create'],
    requiredOrganizationContext: true,
    showInSidebar: true,
    requiredRoleCodes: ['ORG_ADMIN', 'PROCUREMENT_OFFICER'],
  },
  {
    path: '/evidence/packs',
    label: 'Evidence Packs',
    module: 'Evidence',
    requiredPermissions: ['audit:read'],
    requiredOrganizationContext: true,
    showInSidebar: true,
    requiredRoleCodes: [
      'ORG_ADMIN',
      'PROCUREMENT_OFFICER',
      'FINANCIER_USER',
      'AUDITOR',
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
      'ORG_ADMIN',
      'PROCUREMENT_OFFICER',
      'FINANCIER_USER',
      'AUDITOR',
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
      'ORG_ADMIN',
      'PROCUREMENT_OFFICER',
      'FINANCIER_USER',
      'AUDITOR',
    ],
  },
  {
    path: '/evidence/hashes',
    label: 'Hash Verification',
    module: 'Evidence',
    requiredPermissions: ['audit:read'],
    requiredOrganizationContext: true,
    showInSidebar: true,
    requiredRoleCodes: ['ORG_ADMIN', 'AUDITOR'],
  },
  {
    path: '/evidence/hashes/:id',
    label: 'Hash Detail',
    module: 'Evidence',
    requiredPermissions: ['audit:read'],
    requiredOrganizationContext: true,
    showInSidebar: false,
    requiredRoleCodes: ['ORG_ADMIN', 'AUDITOR'],
  },
  {
    path: '/evidence/timeline',
    label: 'Audit Timeline',
    module: 'Evidence',
    requiredPermissions: ['audit:read'],
    requiredOrganizationContext: true,
    showInSidebar: true,
    requiredRoleCodes: [
      'ORG_ADMIN',
      'PROCUREMENT_OFFICER',
      'FINANCIER_USER',
      'SHARIAH_REVIEWER',
      'AUDITOR',
    ],
  },
  {
    path: '/audit',
    label: 'Audit Events',
    module: 'Audit',
    requiredPermissions: ['audit:read'],
    requiredOrganizationContext: true,
    showInSidebar: true,
    requiredRoleCodes: ['ORG_ADMIN', 'AUDITOR'],
  },
  {
    path: '/audit/entity/:entityType/:entityId',
    label: 'Entity Audit Timeline',
    module: 'Audit',
    requiredPermissions: ['audit:read'],
    requiredOrganizationContext: true,
    showInSidebar: false,
    requiredRoleCodes: [
      'ORG_ADMIN',
      'PROCUREMENT_OFFICER',
      'FINANCIER_USER',
      'SHARIAH_REVIEWER',
      'AUDITOR',
    ],
  },
  {
    path: '/audit/search',
    label: 'Audit Search',
    module: 'Audit',
    requiredPermissions: ['audit:read'],
    requiredOrganizationContext: true,
    showInSidebar: true,
    requiredRoleCodes: ['ORG_ADMIN', 'AUDITOR'],
  },
  {
    path: '/finance/opportunities',
    label: 'Finance Opportunities',
    module: 'Finance',
    requiredPermissions: ['finance:review'],
    requiredOrganizationContext: true,
    showInSidebar: true,
    requiredRoleCodes: ['ORG_ADMIN', 'FINANCIER_USER'],
  },
  {
    path: '/finance/opportunities/new',
    label: 'New finance opportunity',
    module: 'Finance',
    requiredPermissions: ['finance:review'],
    requiredOrganizationContext: true,
    showInSidebar: false,
    requiredRoleCodes: ['ORG_ADMIN', 'FINANCIER_USER'],
  },
  {
    path: '/finance/applications',
    label: 'Applications',
    module: 'Finance',
    requiredPermissions: [],
    requiredOrganizationContext: true,
    showInSidebar: true,
    requiredRoleCodes: [
      'ORG_ADMIN',
      'PROCUREMENT_OFFICER',
      'FINANCIER_USER',
      'SHARIAH_REVIEWER',
    ],
  },
  {
    path: '/finance/applications/:applicationId',
    label: 'Application workspace',
    module: 'Finance',
    requiredPermissions: [],
    requiredOrganizationContext: true,
    showInSidebar: false,
    requiredRoleCodes: [
      'ORG_ADMIN',
      'PROCUREMENT_OFFICER',
      'FINANCIER_USER',
      'SHARIAH_REVIEWER',
      'AUDITOR',
    ],
  },
  {
    path: '/finance/applications/:applicationId/:workspaceTab',
    label: 'Application workspace tab',
    module: 'Finance',
    requiredPermissions: [],
    requiredOrganizationContext: true,
    showInSidebar: false,
    requiredRoleCodes: [
      'ORG_ADMIN',
      'PROCUREMENT_OFFICER',
      'FINANCIER_USER',
      'SHARIAH_REVIEWER',
      'AUDITOR',
    ],
  },
  {
    path: '/finance/contracts',
    label: 'Contract Terms',
    module: 'Finance',
    requiredPermissions: [],
    requiredOrganizationContext: true,
    showInSidebar: true,
    requiredRoleCodes: ['ORG_ADMIN', 'FINANCIER_USER', 'SHARIAH_REVIEWER'],
  },
  {
    path: '/finance/ledgers',
    label: 'Ledgers',
    module: 'Finance',
    requiredPermissions: ['finance:review'],
    requiredOrganizationContext: true,
    showInSidebar: true,
    requiredRoleCodes: ['ORG_ADMIN', 'FINANCIER_USER'],
  },
  {
    path: '/finance/profit-loss',
    label: 'Profit/Loss',
    module: 'Finance',
    requiredPermissions: ['finance:review'],
    requiredOrganizationContext: true,
    showInSidebar: true,
    requiredRoleCodes: ['ORG_ADMIN', 'FINANCIER_USER'],
  },
  {
    path: '/finance/closures',
    label: 'Closure Packs',
    module: 'Finance',
    requiredPermissions: [],
    requiredOrganizationContext: true,
    showInSidebar: true,
    requiredRoleCodes: ['ORG_ADMIN', 'FINANCIER_USER', 'AUDITOR'],
  },
  {
    path: '/graph/projects',
    label: 'Project Graph',
    module: 'Graph/Canvas',
    requiredPermissions: [],
    requiredOrganizationContext: true,
    showInSidebar: true,
    requiredRoleCodes: [
      'ORG_ADMIN',
      'PROCUREMENT_OFFICER',
      'FINANCIER_USER',
      'SHARIAH_REVIEWER',
      'AUDITOR',
    ],
  },
  {
    path: '/integrations',
    label: 'Integrations',
    module: 'Integrations',
    requiredPermissions: [],
    requiredOrganizationContext: true,
    showInSidebar: true,
    requiredRoleCodes: [
      'ORG_ADMIN',
      'PROCUREMENT_OFFICER',
      'FINANCIER_USER',
      'AUDITOR',
    ],
  },
] as const

export function matchRouteMetadata(pathname: string) {
  const normalizedPath = normalizePath(pathname)

  return routeMetadata.find((route) => {
    if (route.path.includes(':')) {
      const pattern = new RegExp(
        `^${route.path.replace(/:[^/]+/g, '[^/]+')}$`,
      )
      return pattern.test(normalizedPath)
    }

    return route.path === normalizedPath
  })
}

function normalizePath(pathname: string) {
  if (pathname.length > 1 && pathname.endsWith('/')) {
    return pathname.slice(0, -1)
  }

  return pathname
}
