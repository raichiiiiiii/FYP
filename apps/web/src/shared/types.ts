export type AppSession = {
  organizationId: string | null
  actorUserId: string | null
}

export type AuthSession = {
  userId: string
  email: string
  displayName: string
  organizationId: string
  roleCodes: string[]
  permissionCodes: AppPermission[]
  workspaceScopes: string[]
  expiresAt: string
  authMode: 'dev'
  oidcEnabled: boolean
}

export type DevLoginInput = {
  email?: string
  userId?: string
  organizationId?: string
}

export type AppRoleCode =
  | 'ORG_ADMIN'
  | 'PROCUREMENT_OFFICER'
  | 'APPROVER'
  | 'SUPPLIER_USER'
  | 'FINANCE_ACCOUNTANT'
  | 'FINANCIER_USER'
  | 'SHARIAH_REVIEWER'
  | 'AUDITOR'
  | 'DEVELOPER_INTEGRATOR'

export type AppPermission =
  | 'users:create'
  | 'procurement:create'
  | 'procurement:approve'
  | 'finance:review'
  | 'shariah:review'
  | 'audit:read'

export type DependencyStatus = 'ok' | 'error'

export type HealthResponse = {
  status: 'ok' | 'degraded'
  service: string
  database: DependencyStatus
  redis: DependencyStatus
  environment: string
  timestamp: string
}

export type LoadState<T> =
  | { status: 'loading' }
  | { status: 'ready'; data: T }
  | { status: 'error'; message: string }

export type Organization = {
  id: string
  legalName: string
  registrationNumber?: string | null
  deploymentMode: string
  memberships?: Membership[]
  workspaces?: Workspace[]
}

export type User = {
  id: string
  email: string
  displayName: string
  status: string
}

export type Role = {
  id: string
  code: string
  name: string
  description?: string | null
  permissions?: Permission[]
}

export type Permission = {
  id: string
  code: string
  name: string
}

export type Membership = {
  id: string
  organizationId: string
  userId: string
  roleId: string
  status: string
  user: User
  role: Role
}

export type Workspace = {
  id: string
  name: string
  type: string
  status: string
}

export type AuditEvent = {
  id: string
  organizationId?: string | null
  actorUserId?: string | null
  eventType: string
  entityType?: string | null
  entityId?: string | null
  metadata?: Record<string, unknown> | null
  createdAt: string
  actorUser?: Pick<User, 'id' | 'email' | 'displayName'> | null
  organization?: Pick<Organization, 'id' | 'legalName'> | null
}
