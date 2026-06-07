export type AppSession = {
  organizationId: string | null
  actorUserId: string | null
  organizationDeploymentMode?: DeploymentMode | null
}

export type AuthSession = {
  userId: string
  email: string
  displayName: string
  profileImageUrl?: string | null
  organizationId: string
  organization: {
    id: string
    legalName: string
    deploymentMode: DeploymentMode
  }
  roleCodes: string[]
  permissionCodes: AppPermission[]
  workspaceScopes: string[]
  expiresAt: string
  authMode: 'dev' | 'oidc'
  devAuthEnabled: boolean
  oidcEnabled: boolean
}

export type AuthPublicConfig = {
  devAuthEnabled: boolean
  oidcEnabled: boolean
  oidcTestMode: boolean
}

export type DevLoginInput = {
  email?: string
  userId?: string
  organizationId?: string
}

export type AppRoleCode =
  | 'ORG_ADMIN'
  | 'PROCUREMENT_OFFICER'
  | 'RECEIVING_OFFICER'
  | 'APPROVER'
  | 'APPROVER_MANAGER'
  | 'SUPPLIER_USER'
  | 'SUPPLIER_SALES'
  | 'MUDARIB_OPERATOR'
  | 'SUPPLIER_FINANCE'
  | 'EVIDENCE_SUBMITTER'
  | 'FINANCE_ACCOUNTANT'
  | 'FINANCIER_USER'
  | 'INVESTMENT_OFFICER'
  | 'RISK_REVIEWER'
  | 'DISBURSEMENT_OFFICER'
  | 'FINANCIER_AUDIT_VIEWER'
  | 'SHARIAH_REVIEWER'
  | 'COMPLIANCE_REVIEWER'
  | 'CONTRACT_REVIEWER'
  | 'AUDITOR'
  | 'AUDIT_VIEWER'
  | 'REGULATOR_REVIEWER'
  | 'READ_ONLY_EVIDENCE_VIEWER'
  | 'DEVELOPER_INTEGRATOR'
  | 'ERP_INTEGRATOR'
  | 'API_CLIENT_MANAGER'
  | 'FABRIC_GOVERNANCE_ADMIN'
  | 'PLATFORM_OPERATOR'
  | 'FABRIC_OPERATOR'
  | 'SUPPORT_OPERATOR'
  | 'SECURITY_OPERATOR'

export type AppPermission =
  | 'users:create'
  | 'procurement:create'
  | 'procurement:approve'
  | 'finance:review'
  | 'shariah:review'
  | 'audit:read'
  | 'fabric:governance'
  | 'fabric:operate'

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
  taxIdentifier?: string | null
  shariahProfile?: string | null
  deploymentMode: string
  logoImageUrl?: string | null
  bannerImageUrl?: string | null
  memberships?: Membership[]
  workspaces?: Workspace[]
}

export type User = {
  id: string
  email: string
  displayName: string
  profileImageUrl?: string | null
  status: string
}

export type DeploymentMode =
  | 'standalone_sme'
  | 'financial_entity_node'
  | 'fabric_organization'
  | 'hosted_financier_portal'

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

export type AccountProfile = {
  id: string
  email: string
  displayName: string
  profileImageUrl?: string | null
  status: string
  organizationId: string
  roleCodes: string[]
  permissionCodes: string[]
  memberships: Array<{
    id: string
    organizationId: string
    status: string
    role: Role
    organization: Pick<Organization, 'id' | 'legalName'>
  }>
}

export type InboxItem = {
  id: string
  organizationId: string
  senderUserId: string
  recipientUserId?: string | null
  recipientRoleCode?: string | null
  itemType: 'message' | 'permission_request' | string
  subject: string
  body: string
  status: 'unread' | 'read' | 'closed' | string
  metadata?: Record<string, unknown> | null
  readAt?: string | null
  createdAt: string
  updatedAt: string
  sender?: Pick<User, 'id' | 'email' | 'displayName'> | null
  recipient?: Pick<User, 'id' | 'email' | 'displayName'> | null
}

export type InboxResponse = {
  unreadCount: number
  items: InboxItem[]
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

export type SummarySeverity = 'neutral' | 'success' | 'warning' | 'danger'

export type SummaryArea = 'dashboard' | 'procurement' | 'finance'

export type SummaryMetric = {
  id: string
  label: string
  value: number
  helper: string
  severity: SummarySeverity
  targetRoute?: string
}

export type SummaryQueueItem = {
  id: string
  area: SummaryArea
  title: string
  description: string
  count: number
  priority: 'low' | 'medium' | 'high' | 'critical'
  status: 'open' | 'blocked' | 'pending_external' | 'done'
  targetRoute: string
}

export type SummaryWorkflowBlocker = {
  id: string
  area: SummaryArea
  title: string
  description: string
  count: number
  severity: SummarySeverity
  requiredAction: string
  targetRoute: string
}

export type SummaryReviewReadiness = {
  id: string
  area: SummaryArea
  label: string
  ready: number
  total: number
  missing: number
  status: 'ready' | 'partial' | 'blocked' | 'empty'
  targetRoute: string
}

export type ProcurementSummary = {
  organizationId: string
  generatedAt: string
  metrics: SummaryMetric[]
  queue: SummaryQueueItem[]
  blockers: SummaryWorkflowBlocker[]
  readiness: SummaryReviewReadiness[]
  statusBreakdown: Record<string, number>
}

export type FinanceSummary = {
  organizationId: string
  generatedAt: string
  metrics: SummaryMetric[]
  queue: SummaryQueueItem[]
  blockers: SummaryWorkflowBlocker[]
  readiness: SummaryReviewReadiness[]
  statusBreakdown: Record<string, number>
}
