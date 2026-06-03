import type {
  AppPermission,
  AppRoleCode,
  AppSession,
} from '../../shared/types'
import type { AuthorizationState } from '../../app/authorization'

export const signedInSession: AppSession = {
  organizationId: 'org_123',
  actorUserId: 'user_123',
}

export const anonymousSession: AppSession = {
  organizationId: null,
  actorUserId: null,
}

export function readyAuthorization(
  roleCodes: AppRoleCode[],
  permissionCodes: AppPermission[],
): AuthorizationState {
  return {
    status: 'ready',
    roleCodes,
    permissionCodes,
  }
}
