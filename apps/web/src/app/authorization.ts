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
  'FINANCIER_USER',
  'SHARIAH_REVIEWER',
  'AUDITOR',
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

  if (authorization.status === 'loading') {
    return false
  }

  if (route.requiredOrganizationContext && !session.organizationId) {
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

  if (
    route.requiredPermissions.length &&
    !route.requiredPermissions.every((permission) =>
      authorization.permissionCodes.includes(permission),
    )
  ) {
    return false
  }

  return true
}

function isAppRoleCode(code: string): code is AppRoleCode {
  return knownRoleCodes.has(code as AppRoleCode)
}
