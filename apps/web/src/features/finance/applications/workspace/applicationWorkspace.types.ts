import type { AppRoleCode } from '../../../../shared/types'
import type { MudarabahApplicationStatus } from '../applications.types'

export type EvidenceStatus =
  | 'missing'
  | 'submitted'
  | 'verified'
  | 'waived'
  | 'rejected'

export type ReviewDecision =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'changes_requested'

export type WorkspaceTabId =
  | 'overview'
  | 'evidence'
  | 'due-diligence'
  | 'shariah-review'
  | 'contract'
  | 'disbursement'
  | 'ledger'
  | 'profit-loss'
  | 'closure'
  | 'audit'

export type WorkspaceTab = {
  id: WorkspaceTabId
  label: string
  section: string
  roleCodes: AppRoleCode[]
}

export type EvidenceItem = {
  id: string
  label: string
  required: boolean
  status: EvidenceStatus
  sourceDocumentId?: string
}

export type AuditSummary = {
  materialEventCount: number
  latestEventType?: string
  latestEventAt?: string
  anchorStatus: 'not_requested' | 'pending' | 'anchored_mock' | 'verified' | 'failed'
}

export type ApplicationWorkspace = {
  id: string
  opportunityId: string
  opportunityTitle: string
  status: MudarabahApplicationStatus
  rawStatus: string
  applicantOrganizationName: string
  financierOrganizationName?: string
  requestedCapitalAmount: number
  currency: string
  expectedRevenueAmount: number
  expectedCostAmount: number
  proposedProfitRatio: {
    rabbUlMal: number
    mudarib: number
  }
  evidence: EvidenceItem[]
  financierDecision: ReviewDecision
  shariahDecision: ReviewDecision
  auditSummary: AuditSummary
}

export type WorkspaceAction = {
  id: string
  label: string
  roleScope: string
  visible: boolean
  enabled: boolean
  reason: string
}

export type WorkspaceRoleProfile = {
  canViewWorkspace: boolean
  canSubmitEvidence: boolean
  canReviewFinance: boolean
  canReviewShariah: boolean
  canViewContract: boolean
  canViewDisbursement: boolean
  canViewMonitoring: boolean
  canViewClosure: boolean
  canViewAudit: boolean
  isReadOnly: boolean
}

export type ApplicationWorkspaceRawDto = {
  id: string
  opportunityId?: string | null
  status?: string | null
  requestedCapital?: number | string | null
  currency?: string | null
  capitalProviderRatio?: number | string | null
  entrepreneurRatio?: number | string | null
  createdAt?: string | null
  updatedAt?: string | null
  opportunity?: {
    id?: string | null
    title?: string | null
    estimatedCapital?: number | string | null
    expectedProfit?: number | string | null
    currency?: string | null
    project?: {
      name?: string | null
    } | null
  } | null
  applicantUser?: {
    displayName?: string | null
    email?: string | null
  } | null
  evidenceChecklist?: {
    status?: string | null
    items?: Array<{
      id: string
      label?: string | null
      requiredCode?: string | null
      status?: string | null
      evidenceItem?: {
        id?: string | null
      } | null
    }>
  } | null
  dueDiligenceReports?: Array<{
    status?: string | null
    decision?: string | null
    riskRating?: string | null
    createdAt?: string | null
  }>
  shariahReviews?: Array<{
    status?: string | null
    decision?: string | null
    createdAt?: string | null
  }>
  contracts?: Array<{
    id: string
    status?: string | null
    createdAt?: string | null
  }>
  disbursements?: Array<{
    id: string
    createdAt?: string | null
    disbursedAt?: string | null
  }>
  ledgerEntries?: Array<{
    id: string
  }>
  profitLossStatements?: Array<{
    id: string
    status?: string | null
    createdAt?: string | null
  }>
  closurePacks?: Array<{
    id: string
    status?: string | null
    exportedAt?: string | null
  }>
}
