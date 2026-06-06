import type { AppRoleCode } from '../../../../shared/types'
import {
  applicationStatusLabels,
  applicationStatuses,
  normalizeApplicationStatus,
} from '../applications.model'
import type { MudarabahApplicationStatus } from '../applications.types'
import type {
  ApplicationWorkspace,
  ApplicationWorkspaceRawDto,
  AuditSummary,
  EvidenceStatus,
  LossException,
  LossExceptionClassification,
  LossExceptionRawDto,
  LossExceptionStatus,
  ReviewDecision,
  WorkspaceAction,
  WorkspaceRoleProfile,
  WorkspaceTab,
  WorkspaceTabId,
} from './applicationWorkspace.types'

export const lossExceptionClassifications: readonly LossExceptionClassification[] =
  [
    'GENUINE_COMMERCIAL_LOSS',
    'BREACH',
    'NEGLIGENCE',
    'MISCONDUCT',
    'FRAUD',
    'INSUFFICIENT_EVIDENCE',
  ] as const

export const lossExceptionClassificationLabels: Record<
  LossExceptionClassification,
  string
> = {
  GENUINE_COMMERCIAL_LOSS: 'Genuine commercial loss',
  BREACH: 'Breach',
  NEGLIGENCE: 'Negligence',
  MISCONDUCT: 'Misconduct',
  FRAUD: 'Fraud',
  INSUFFICIENT_EVIDENCE: 'Insufficient evidence',
}

export const lossExceptionStatusLabels: Record<LossExceptionStatus, string> = {
  OPEN: 'Open',
  EVIDENCE_REQUESTED: 'Evidence requested',
  UNDER_REVIEW: 'Under review',
  CLASSIFIED: 'Classified',
  REJECTED: 'Rejected',
  RESOLVED: 'Resolved',
  REOPENED: 'Reopened',
  CANCELLED: 'Cancelled',
}

export const workspaceTabs: readonly WorkspaceTab[] = [
  {
    id: 'overview',
    label: 'Overview',
    section: 'Application summary and lifecycle',
    roleCodes: [
      'ORG_ADMIN',
      'PROCUREMENT_OFFICER',
      'FINANCIER_USER',
      'SHARIAH_REVIEWER',
      'AUDITOR',
    ],
  },
  {
    id: 'evidence',
    label: 'Evidence',
    section: 'Evidence checklist',
    roleCodes: [
      'ORG_ADMIN',
      'PROCUREMENT_OFFICER',
      'FINANCIER_USER',
      'SHARIAH_REVIEWER',
      'AUDITOR',
    ],
  },
  {
    id: 'due-diligence',
    label: 'Due Diligence',
    section: 'Financier review',
    roleCodes: ['ORG_ADMIN', 'FINANCIER_USER', 'AUDITOR'],
  },
  {
    id: 'shariah-review',
    label: 'Shariah Review',
    section: 'Shariah eligibility review',
    roleCodes: ['ORG_ADMIN', 'SHARIAH_REVIEWER', 'AUDITOR'],
  },
  {
    id: 'contract',
    label: 'Contract',
    section: 'Restricted contract state',
    roleCodes: ['ORG_ADMIN', 'FINANCIER_USER', 'SHARIAH_REVIEWER', 'AUDITOR'],
  },
  {
    id: 'disbursement',
    label: 'Disbursement',
    section: 'Capital release state',
    roleCodes: ['ORG_ADMIN', 'FINANCIER_USER', 'AUDITOR'],
  },
  {
    id: 'ledger',
    label: 'Ledger',
    section: 'Project monitoring ledger',
    roleCodes: ['ORG_ADMIN', 'FINANCIER_USER', 'AUDITOR'],
  },
  {
    id: 'profit-loss',
    label: 'Profit/Loss',
    section: 'Profit/loss calculation state',
    roleCodes: ['ORG_ADMIN', 'FINANCIER_USER', 'SHARIAH_REVIEWER', 'AUDITOR'],
  },
  {
    id: 'closure',
    label: 'Closure',
    section: 'Closure pack state',
    roleCodes: ['ORG_ADMIN', 'FINANCIER_USER', 'AUDITOR'],
  },
  {
    id: 'audit',
    label: 'Audit',
    section: 'Audit and verification trail',
    roleCodes: [
      'ORG_ADMIN',
      'PROCUREMENT_OFFICER',
      'FINANCIER_USER',
      'SHARIAH_REVIEWER',
      'AUDITOR',
    ],
  },
] as const

export function normalizeWorkspaceTab(tab?: string): WorkspaceTabId {
  return workspaceTabs.some((workspaceTab) => workspaceTab.id === tab)
    ? (tab as WorkspaceTabId)
    : 'overview'
}

export function buildWorkspaceRoleProfile(
  roleCodes: readonly AppRoleCode[],
): WorkspaceRoleProfile {
  const hasRole = (roles: readonly AppRoleCode[]) =>
    roles.some((role) => roleCodes.includes(role))
  const canReviewFinance = hasRole(['ORG_ADMIN', 'FINANCIER_USER'])
  const isAuditor = hasRole(['AUDITOR'])

  return {
    canViewWorkspace: hasRole([
      'ORG_ADMIN',
      'PROCUREMENT_OFFICER',
      'FINANCIER_USER',
      'SHARIAH_REVIEWER',
      'AUDITOR',
    ]),
    canSubmitEvidence: hasRole(['ORG_ADMIN', 'PROCUREMENT_OFFICER']),
    canReviewFinance,
    canReviewShariah: hasRole(['ORG_ADMIN', 'SHARIAH_REVIEWER']),
    canViewContract: hasRole([
      'ORG_ADMIN',
      'FINANCIER_USER',
      'SHARIAH_REVIEWER',
      'AUDITOR',
    ]),
    canViewDisbursement: hasRole(['ORG_ADMIN', 'FINANCIER_USER', 'AUDITOR']),
    canViewMonitoring: hasRole(['ORG_ADMIN', 'FINANCIER_USER', 'AUDITOR']),
    canViewClosure: hasRole(['ORG_ADMIN', 'FINANCIER_USER', 'AUDITOR']),
    canViewAudit: hasRole([
      'ORG_ADMIN',
      'PROCUREMENT_OFFICER',
      'FINANCIER_USER',
      'SHARIAH_REVIEWER',
      'AUDITOR',
    ]),
    isReadOnly: isAuditor,
  }
}

export function getVisibleWorkspaceTabs(roleCodes: readonly AppRoleCode[]) {
  const roleProfile = buildWorkspaceRoleProfile(roleCodes)

  if (!roleProfile.canViewWorkspace) {
    return []
  }

  return workspaceTabs.map((tab) => ({
    ...tab,
    canView: tab.roleCodes.some((roleCode) => roleCodes.includes(roleCode)),
  }))
}

export function canViewWorkspaceTab(
  tabId: WorkspaceTabId,
  roleCodes: readonly AppRoleCode[],
) {
  const tab = workspaceTabs.find((candidate) => candidate.id === tabId)

  return Boolean(
    tab?.roleCodes.some((roleCode) => roleCodes.includes(roleCode)),
  )
}

export function mapApplicationWorkspace(
  application: ApplicationWorkspaceRawDto,
): ApplicationWorkspace {
  const status = normalizeApplicationStatus(application.status)
  const estimatedCapital = toNumber(application.opportunity?.estimatedCapital)
  const expectedProfit = toNumber(application.opportunity?.expectedProfit)
  const expectedCostAmount =
    estimatedCapital || toNumber(application.requestedCapital)
  const expectedRevenueAmount = expectedCostAmount + expectedProfit
  const lossExceptions = mapLossExceptions(application)

  return {
    id: application.id,
    opportunityId:
      application.opportunity?.id || application.opportunityId || 'unlinked',
    opportunityTitle:
      application.opportunity?.title ||
      application.opportunity?.project?.name ||
      'Unlinked procurement opportunity',
    status,
    rawStatus: application.status || 'DRAFT',
    applicantOrganizationName:
      application.applicantUser?.displayName ||
      application.applicantUser?.email ||
      'Applicant organization pending',
    financierOrganizationName: inferFinancierName(application),
    requestedCapitalAmount: toNumber(application.requestedCapital),
    currency: application.currency || application.opportunity?.currency || 'MYR',
    expectedRevenueAmount,
    expectedCostAmount,
    proposedProfitRatio: {
      rabbUlMal: toNumber(application.capitalProviderRatio),
      mudarib: toNumber(application.entrepreneurRatio),
    },
    evidence: mapEvidence(application),
    financierDecision: mapReviewDecision(application.dueDiligenceReports?.[0]),
    shariahDecision: mapReviewDecision(application.shariahReviews?.[0]),
    auditSummary: buildAuditSummary(application),
    lossExceptions,
    closureBlockedByLossException: lossExceptions.some((exception) =>
      isLossExceptionClosureBlocking(exception.status),
    ),
  }
}

export function buildWorkspaceActions(
  workspace: ApplicationWorkspace,
  roleCodes: readonly AppRoleCode[],
): WorkspaceAction[] {
  const roleProfile = buildWorkspaceRoleProfile(roleCodes)

  return [
    {
      id: 'submit-evidence',
      label: 'Submit evidence',
      roleScope: 'Procurement evidence owner',
      visible: roleProfile.canSubmitEvidence,
      enabled: false,
      reason: 'Evidence item mutations are reserved for Slice 4C.',
    },
    {
      id: 'record-due-diligence',
      label: 'Record due diligence',
      roleScope: 'Financier reviewer',
      visible: roleProfile.canReviewFinance,
      enabled: false,
      reason:
        workspace.status === 'due_diligence'
          ? 'Decision mutations are reserved for Slice 4D.'
          : `Application is ${applicationStatusLabels[workspace.status]}.`,
    },
    {
      id: 'record-shariah-review',
      label: 'Record Shariah review',
      roleScope: 'Shariah reviewer',
      visible: roleProfile.canReviewShariah,
      enabled: false,
      reason:
        workspace.status === 'shariah_review'
          ? 'Decision mutations are reserved for Slice 4E.'
          : `Application is ${applicationStatusLabels[workspace.status]}.`,
    },
    {
      id: 'generate-contract',
      label: 'Generate contract',
      roleScope: 'Finance operator',
      visible: roleProfile.canViewContract,
      enabled: false,
      reason: 'Contract mutations are reserved for Slice 4F.',
    },
    {
      id: 'record-disbursement',
      label: 'Record disbursement',
      roleScope: 'Finance operator',
      visible: roleProfile.canViewDisbursement,
      enabled: false,
      reason: 'Disbursement mutations are reserved for Slice 4F.',
    },
    {
      id: 'export-closure',
      label: 'Export closure',
      roleScope: 'Closure reviewer',
      visible: roleProfile.canViewClosure,
      enabled: false,
      reason: 'Closure mutations are reserved for Slice 4G.',
    },
  ]
}

export function getLifecycleSteps(status: MudarabahApplicationStatus) {
  const currentIndex = applicationStatuses.indexOf(status)

  return applicationStatuses.map((step, index) => ({
    id: step,
    label: applicationStatusLabels[step],
    state:
      step === 'rejected' || step === 'loss_exception'
        ? ('exception' as const)
        : index < currentIndex
          ? ('complete' as const)
          : index === currentIndex
            ? ('current' as const)
            : ('upcoming' as const),
  }))
}

function mapEvidence(application: ApplicationWorkspaceRawDto) {
  return (
    application.evidenceChecklist?.items?.map((item) => ({
      id: item.id,
      label: item.label || item.requiredCode || 'Evidence item',
      required: true,
      status: mapEvidenceStatus(item.status),
      sourceDocumentId: item.evidenceItem?.id || undefined,
    })) ?? []
  )
}

function mapEvidenceStatus(status?: string | null): EvidenceStatus {
  const normalized = (status || '').toUpperCase()

  if (normalized === 'COMPLETED' || normalized === 'VERIFIED') {
    return 'verified'
  }

  if (normalized === 'WAIVED') {
    return 'waived'
  }

  if (normalized === 'REJECTED') {
    return 'rejected'
  }

  if (normalized === 'SUBMITTED' || normalized === 'PENDING_REVIEW') {
    return 'submitted'
  }

  return 'missing'
}

export function mapLossExceptions(
  application: ApplicationWorkspaceRawDto,
): LossException[] {
  const direct = application.lossExceptions ?? []
  const nested =
    application.profitLossStatements?.flatMap(
      (statement) => statement.lossExceptions ?? [],
    ) ?? []
  const seen = new Set<string>()

  return [...direct, ...nested].flatMap((exception) => {
    if (seen.has(exception.id)) {
      return []
    }
    seen.add(exception.id)
    return [mapLossException(exception)]
  })
}

export function mapLossException(exception: LossExceptionRawDto): LossException {
  const rawStatus = exception.status || 'OPEN'
  const rawClassification = exception.exceptionType || 'GENUINE_COMMERCIAL_LOSS'

  return {
    id: exception.id,
    statementId: exception.statementId,
    classification: normalizeLossExceptionClassification(rawClassification),
    rawClassification,
    status: normalizeLossExceptionStatus(rawStatus),
    rawStatus,
    amount: toNumber(exception.amount),
    notes: exception.notes,
    decision: exception.decision,
    rationale: exception.rationale,
    reviewerUserId: exception.reviewerUserId,
    decidedAt: exception.decidedAt,
    resolvedAt: exception.resolvedAt,
    createdAt: exception.createdAt,
  }
}

export function normalizeLossExceptionStatus(
  status?: string | null,
): LossExceptionStatus {
  const normalized = (status || '').toUpperCase()

  if (
    [
      'OPEN',
      'EVIDENCE_REQUESTED',
      'UNDER_REVIEW',
      'CLASSIFIED',
      'REJECTED',
      'RESOLVED',
      'REOPENED',
      'CANCELLED',
    ].includes(normalized)
  ) {
    return normalized as LossExceptionStatus
  }

  return 'OPEN'
}

export function normalizeLossExceptionClassification(
  classification?: string | null,
): LossExceptionClassification {
  const normalized = (classification || '').toUpperCase()

  if (lossExceptionClassifications.includes(normalized as LossExceptionClassification)) {
    return normalized as LossExceptionClassification
  }

  return 'GENUINE_COMMERCIAL_LOSS'
}

export function isLossExceptionClosureBlocking(status: LossExceptionStatus) {
  return !['RESOLVED', 'REJECTED'].includes(status)
}

function mapReviewDecision(review?: {
  status?: string | null
  decision?: string | null
}): ReviewDecision {
  const normalized = (review?.decision || review?.status || '').toUpperCase()

  if (normalized === 'APPROVED') {
    return 'approved'
  }

  if (normalized === 'REJECTED') {
    return 'rejected'
  }

  if (
    normalized === 'CHANGES_REQUESTED' ||
    normalized === 'AMENDMENT_REQUIRED'
  ) {
    return 'changes_requested'
  }

  return 'pending'
}

function inferFinancierName(application: ApplicationWorkspaceRawDto) {
  const assignedReviewer =
    application.dueDiligenceReports?.[0]?.status ||
    application.dueDiligenceReports?.[0]?.riskRating

  return assignedReviewer ? 'Assigned financier workspace' : undefined
}

function buildAuditSummary(application: ApplicationWorkspaceRawDto): AuditSummary {
  const materialEventCount = [
    application.evidenceChecklist,
    application.dueDiligenceReports?.[0],
    application.shariahReviews?.[0],
    application.contracts?.[0],
    application.disbursements?.[0],
    application.profitLossStatements?.[0],
    application.closurePacks?.[0],
  ].filter(Boolean).length
  const latestEventAt =
    application.closurePacks?.[0]?.exportedAt ||
    application.profitLossStatements?.[0]?.createdAt ||
    application.disbursements?.[0]?.disbursedAt ||
    application.contracts?.[0]?.createdAt ||
    application.shariahReviews?.[0]?.createdAt ||
    application.dueDiligenceReports?.[0]?.createdAt ||
    application.updatedAt ||
    application.createdAt ||
    undefined

  return {
    materialEventCount,
    latestEventType: inferLatestEventType(application),
    latestEventAt,
    anchorStatus: 'not_requested',
  }
}

function inferLatestEventType(application: ApplicationWorkspaceRawDto) {
  if (application.closurePacks?.length) {
    return 'CLOSURE_PACK_EXPORTED'
  }

  if (application.profitLossStatements?.length) {
    return 'PROFIT_LOSS_STATEMENT_CREATED'
  }

  if (application.disbursements?.length) {
    return 'DISBURSEMENT_RECORDED'
  }

  if (application.contracts?.length) {
    return 'MUDARABAH_CONTRACT_CREATED'
  }

  if (application.shariahReviews?.length) {
    return 'SHARIAH_REVIEW_RECORDED'
  }

  if (application.dueDiligenceReports?.length) {
    return 'DUE_DILIGENCE_RECORDED'
  }

  if (application.evidenceChecklist) {
    return 'EVIDENCE_CHECKLIST_GENERATED'
  }

  return 'MUDARABAH_APPLICATION_CREATED'
}

function toNumber(value?: number | string | null) {
  const numberValue = Number(value ?? 0)
  return Number.isFinite(numberValue) ? numberValue : 0
}
