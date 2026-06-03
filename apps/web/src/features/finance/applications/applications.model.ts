import type { AppRoleCode } from '../../../shared/types'
import type {
  ApplicationFiltersState,
  ApplicationRawDto,
  ApplicationReviewRole,
  ApplicationRiskRating,
  ApplicationSortKey,
  ApplicationSummary,
  MudarabahApplicationStatus,
} from './applications.types'

export const applicationStatuses: readonly MudarabahApplicationStatus[] = [
  'draft',
  'evidence_required',
  'submitted',
  'due_diligence',
  'shariah_review',
  'approved',
  'rejected',
  'contracting',
  'active',
  'monitoring',
  'closure_pending',
  'closed',
  'loss_exception',
] as const

export const applicationStatusLabels: Record<MudarabahApplicationStatus, string> = {
  draft: 'Draft',
  evidence_required: 'Evidence required',
  submitted: 'Submitted',
  due_diligence: 'Due diligence',
  shariah_review: 'Shariah review',
  approved: 'Approved',
  rejected: 'Rejected',
  contracting: 'Contracting',
  active: 'Active',
  monitoring: 'Monitoring',
  closure_pending: 'Closure pending',
  closed: 'Closed',
  loss_exception: 'Loss exception',
}

const statusMap: Record<string, MudarabahApplicationStatus> = {
  DRAFT: 'draft',
  EVIDENCE_PENDING: 'evidence_required',
  EVIDENCE_REQUIRED: 'evidence_required',
  SUBMITTED: 'submitted',
  DUE_DILIGENCE: 'due_diligence',
  DUE_DILIGENCE_IN_REVIEW: 'due_diligence',
  SHARIAH_REVIEW: 'shariah_review',
  SHARIAH_IN_REVIEW: 'shariah_review',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  CONTRACTING: 'contracting',
  CONTRACT_PENDING_SIGNATURE: 'contracting',
  CONTRACT_EXECUTED: 'contracting',
  ACTIVE: 'active',
  DISBURSED: 'active',
  MONITORING: 'monitoring',
  CLOSURE_PENDING: 'closure_pending',
  PROFIT_LOSS_CALCULATED: 'closure_pending',
  CLOSED: 'closed',
  LOSS_EXCEPTION: 'loss_exception',
  LOSS_EXCEPTION_IN_REVIEW: 'loss_exception',
}

const roleQueueStatuses: Record<
  Exclude<ApplicationReviewRole, 'all'>,
  readonly MudarabahApplicationStatus[]
> = {
  procurement: ['draft', 'evidence_required', 'submitted', 'active', 'monitoring'],
  financier: ['submitted', 'due_diligence', 'approved', 'contracting', 'active'],
  shariah: ['shariah_review', 'approved', 'contracting'],
  auditor: ['closure_pending', 'closed', 'loss_exception'],
}

const riskRatings: readonly ApplicationRiskRating[] = [
  'low',
  'medium',
  'high',
  'critical',
  'unknown',
]

export function normalizeApplicationStatus(
  status?: string | null,
): MudarabahApplicationStatus {
  if (!status) {
    return 'draft'
  }

  return statusMap[status.trim().toUpperCase()] ?? 'draft'
}

export function normalizeRiskRating(
  riskRating?: string | null,
): ApplicationRiskRating {
  if (!riskRating) {
    return 'unknown'
  }

  const normalized = riskRating.trim().toLowerCase() as ApplicationRiskRating
  return riskRatings.includes(normalized) ? normalized : 'unknown'
}

export function summarizeApplication(application: ApplicationRawDto): ApplicationSummary {
  const status = normalizeApplicationStatus(application.status)
  const opportunityTitle =
    application.opportunity?.title ||
    application.opportunity?.project?.name ||
    application.purpose ||
    `Application ${application.id.slice(0, 8)}`
  const applicantName =
    application.applicantUser?.displayName || application.applicantUser?.email || null
  const checklistGapCount =
    application.evidenceChecklist?.items?.filter(
      (item) => (item.status || '').toUpperCase() !== 'COMPLETED',
    ).length ?? 0

  return {
    id: application.id,
    opportunityTitle,
    applicantName,
    requestedCapital: Number(application.requestedCapital ?? 0),
    currency: application.currency || 'MYR',
    status,
    rawStatus: application.status || 'DRAFT',
    riskRating: inferRiskRating(application),
    evidenceGapCount: Number(application.evidenceGapCount ?? checklistGapCount),
    nextReviewer: inferNextReviewer(application, status),
    dueAt: application.dueAt ?? null,
    submittedAt: application.submittedAt ?? application.createdAt ?? null,
    updatedAt: application.updatedAt ?? application.createdAt ?? null,
  }
}

export function summarizeApplications(
  applications: readonly ApplicationRawDto[],
): ApplicationSummary[] {
  return applications.map(summarizeApplication)
}

export function filterApplications(
  applications: readonly ApplicationSummary[],
  filters: ApplicationFiltersState,
) {
  const search = filters.search.trim().toLowerCase()
  const queueStatuses =
    filters.roleQueue === 'all' ? null : roleQueueStatuses[filters.roleQueue]

  return applications.filter((application) => {
    const matchesSearch =
      !search ||
      [
        application.opportunityTitle,
        application.applicantName,
        application.id,
        application.nextReviewer,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(search))

    const matchesStatus =
      filters.status === 'all' || application.status === filters.status
    const matchesQueue =
      !queueStatuses || queueStatuses.includes(application.status)
    const matchesRisk =
      filters.riskRating === 'all' || application.riskRating === filters.riskRating

    return matchesSearch && matchesStatus && matchesQueue && matchesRisk
  })
}

export function sortApplications(
  applications: readonly ApplicationSummary[],
  sortKey: ApplicationSortKey,
) {
  return [...applications].sort((left, right) => {
    if (sortKey === 'capital') {
      return right.requestedCapital - left.requestedCapital
    }

    if (sortKey === 'dueAt') {
      return dateRank(left.dueAt) - dateRank(right.dueAt)
    }

    return (
      applicationStatuses.indexOf(left.status) -
        applicationStatuses.indexOf(right.status) ||
      dateRank(left.dueAt) - dateRank(right.dueAt)
    )
  })
}

export function buildApplicationMetrics(applications: readonly ApplicationSummary[]) {
  return [
    {
      label: 'Total applications',
      value: applications.length,
      tone: 'neutral',
    },
    {
      label: 'Awaiting review',
      value: applications.filter((application) =>
        ['submitted', 'due_diligence', 'shariah_review'].includes(
          application.status,
        ),
      ).length,
      tone: 'warning',
    },
    {
      label: 'Evidence gaps',
      value: applications.reduce(
        (total, application) => total + application.evidenceGapCount,
        0,
      ),
      tone: 'danger',
    },
    {
      label: 'Approved or active',
      value: applications.filter((application) =>
        ['approved', 'contracting', 'active', 'monitoring'].includes(
          application.status,
        ),
      ).length,
      tone: 'success',
    },
  ] as const
}

export function applicationWorkspaceRoute(applicationId: string) {
  return `/finance/applications/${encodeURIComponent(applicationId)}`
}

export function canCreateApplication(roleCodes: readonly AppRoleCode[]) {
  return roleCodes.some((roleCode) =>
    ['ORG_ADMIN', 'FINANCIER_USER'].includes(roleCode),
  )
}

export function canViewApplicationPipeline(roleCodes: readonly AppRoleCode[]) {
  return roleCodes.some((roleCode) =>
    [
      'ORG_ADMIN',
      'PROCUREMENT_OFFICER',
      'FINANCIER_USER',
      'SHARIAH_REVIEWER',
      'AUDITOR',
    ].includes(roleCode),
  )
}

function inferRiskRating(application: ApplicationRawDto) {
  const latestDueDiligence = application.dueDiligenceReports?.at(-1)

  return normalizeRiskRating(application.riskRating || latestDueDiligence?.riskRating)
}

function inferNextReviewer(
  application: ApplicationRawDto,
  status: MudarabahApplicationStatus,
) {
  if (application.nextReviewer) {
    return application.nextReviewer
  }

  const dueDiligenceReviewer =
    application.dueDiligenceReports?.at(-1)?.reviewerUser?.displayName ||
    application.dueDiligenceReports?.at(-1)?.reviewerUser?.email
  const shariahReviewer =
    application.shariahReviews?.at(-1)?.reviewerUser?.displayName ||
    application.shariahReviews?.at(-1)?.reviewerUser?.email

  if (status === 'due_diligence') {
    return dueDiligenceReviewer || 'Financier reviewer'
  }

  if (status === 'shariah_review') {
    return shariahReviewer || 'Shariah reviewer'
  }

  if (status === 'evidence_required') {
    return 'Procurement evidence owner'
  }

  if (status === 'closure_pending' || status === 'loss_exception') {
    return 'Auditor'
  }

  return 'No active reviewer'
}

function dateRank(value?: string | null) {
  if (!value) {
    return Number.MAX_SAFE_INTEGER
  }

  const time = new Date(value).getTime()
  return Number.isNaN(time) ? Number.MAX_SAFE_INTEGER : time
}
