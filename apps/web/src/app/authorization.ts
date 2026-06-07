import type {
  AppPermission,
  AppRoleCode,
  AppSession,
  AuthSession,
} from '../shared/types'
import type { AppRouteMetadata } from './navigation'

export type SidebarVisibilityOverrides = Record<string, boolean>

export type AuthorizationState =
  | {
      status: 'anonymous'
      roleCodes: AppRoleCode[]
      permissionCodes: AppPermission[]
    }
  | {
      status: 'loading'
      roleCodes: AppRoleCode[]
      permissionCodes: AppPermission[]
    }
  | {
      status: 'ready'
      roleCodes: AppRoleCode[]
      permissionCodes: AppPermission[]
    }
  | {
      status: 'error'
      message: string
      roleCodes: AppRoleCode[]
      permissionCodes: AppPermission[]
    }

const knownRoleCodes = new Set<AppRoleCode>([
  'ORG_ADMIN',
  'PROCUREMENT_OFFICER',
  'RECEIVING_OFFICER',
  'APPROVER',
  'APPROVER_MANAGER',
  'SUPPLIER_USER',
  'SUPPLIER_SALES',
  'MUDARIB_OPERATOR',
  'SUPPLIER_FINANCE',
  'EVIDENCE_SUBMITTER',
  'FINANCE_ACCOUNTANT',
  'FINANCIER_USER',
  'INVESTMENT_OFFICER',
  'RISK_REVIEWER',
  'DISBURSEMENT_OFFICER',
  'FINANCIER_AUDIT_VIEWER',
  'SHARIAH_REVIEWER',
  'COMPLIANCE_REVIEWER',
  'CONTRACT_REVIEWER',
  'AUDITOR',
  'AUDIT_VIEWER',
  'REGULATOR_REVIEWER',
  'READ_ONLY_EVIDENCE_VIEWER',
  'DEVELOPER_INTEGRATOR',
  'ERP_INTEGRATOR',
  'API_CLIENT_MANAGER',
  'FABRIC_GOVERNANCE_ADMIN',
  'PLATFORM_OPERATOR',
  'FABRIC_OPERATOR',
  'SUPPORT_OPERATOR',
  'SECURITY_OPERATOR',
])

export function authorizationFromSession(
  authSession: AuthSession | null,
): AuthorizationState {
  if (!authSession) {
    return {
      status: 'anonymous',
      roleCodes: [],
      permissionCodes: [],
    }
  }

  return {
    status: 'ready',
    roleCodes: authSession.roleCodes.filter(isAppRoleCode),
    permissionCodes: authSession.permissionCodes,
  }
}

export function canAccessRoute(
  route: AppRouteMetadata,
  session: AppSession,
  authorization: AuthorizationState,
) {
  const hasSession = Boolean(session.organizationId && session.actorUserId)

  if (!hasSession) {
    return Boolean(route.allowAnonymous)
  }

  if (authorization.status !== 'ready') {
    return false
  }

  if (!route.allowAnonymous && authorization.roleCodes.length === 0) {
    return false
  }

  const hasElevatedNavigationAccess =
    authorization.roleCodes.includes('ORG_ADMIN')

  if (route.requiredOrganizationContext && !session.organizationId) {
    return false
  }

  if (
    route.deploymentModes?.length &&
    (!session.organizationDeploymentMode ||
      !route.deploymentModes.includes(session.organizationDeploymentMode))
  ) {
    return false
  }

  if (
    route.requiredRoleCodes?.length &&
    !hasElevatedNavigationAccess &&
    !route.requiredRoleCodes.some((roleCode) =>
      authorization.roleCodes.includes(roleCode),
    )
  ) {
    return false
  }

  if (
    route.requiredPermissions.length &&
    !hasElevatedNavigationAccess &&
    !route.requiredPermissions.every((permission) =>
      authorization.permissionCodes.includes(permission),
    )
  ) {
    return false
  }

  if (
    route.requiredAnyPermissions?.length &&
    !hasElevatedNavigationAccess &&
    !route.requiredAnyPermissions.some((permission) =>
      authorization.permissionCodes.includes(permission),
    )
  ) {
    return false
  }

  return true
}

export function getVisibleSidebarRoutes(
  routes: readonly AppRouteMetadata[],
  session: AppSession,
  authorization: AuthorizationState,
  sidebarVisibilityOverrides: SidebarVisibilityOverrides = {},
) {
  if (authorization.status !== 'ready') {
    return []
  }

  const hasElevatedNavigationAccess =
    authorization.roleCodes.includes('ORG_ADMIN')

  return routes.filter(
    (route) =>
      route.showInSidebar &&
      canAccessRoute(route, session, authorization) &&
      (hasElevatedNavigationAccess ||
        sidebarVisibilityOverrides[route.path] !== false),
  )
}

function isAppRoleCode(code: string): code is AppRoleCode {
  return knownRoleCodes.has(code as AppRoleCode)
}
