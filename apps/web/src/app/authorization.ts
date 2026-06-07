import type {
  AppPermission,
  AppRoleCode,
  AppSession,
  AuthSession,
} from '../shared/types'
import type { AppRouteMetadata } from './navigation'

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
  'APPROVER',
  'SUPPLIER_USER',
  'FINANCE_ACCOUNTANT',
  'FINANCIER_USER',
  'SHARIAH_REVIEWER',
  'AUDITOR',
  'DEVELOPER_INTEGRATOR',
  'FABRIC_GOVERNANCE_ADMIN',
  'PLATFORM_OPERATOR',
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
    !route.requiredRoleCodes.some((roleCode) =>
      authorization.roleCodes.includes(roleCode),
    )
  ) {
    return false
  }

  const hasElevatedNavigationAccess =
    authorization.roleCodes.includes('ORG_ADMIN')

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
) {
  if (authorization.status !== 'ready') {
    return []
  }

  return routes.filter(
    (route) => route.showInSidebar && canAccessRoute(route, session, authorization),
  )
}

function isAppRoleCode(code: string): code is AppRoleCode {
  return knownRoleCodes.has(code as AppRoleCode)
}
