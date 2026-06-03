export type MudarabahApplicationStatus =
  | 'draft'
  | 'evidence_required'
  | 'submitted'
  | 'due_diligence'
  | 'shariah_review'
  | 'approved'
  | 'rejected'
  | 'contracting'
  | 'active'
  | 'monitoring'
  | 'closure_pending'
  | 'closed'
  | 'loss_exception'

export type ApplicationRiskRating = 'low' | 'medium' | 'high' | 'critical' | 'unknown'

export type ApplicationReviewRole =
  | 'all'
  | 'procurement'
  | 'financier'
  | 'shariah'
  | 'auditor'

export type ApplicationSummary = {
  id: string
  opportunityTitle: string
  applicantName?: string | null
  requestedCapital: number
  currency: string
  status: MudarabahApplicationStatus
  rawStatus: string
  riskRating: ApplicationRiskRating
  evidenceGapCount: number
  nextReviewer: string
  dueAt?: string | null
  submittedAt?: string | null
  updatedAt?: string | null
}

export type ApplicationFiltersState = {
  search: string
  status: MudarabahApplicationStatus | 'all'
  roleQueue: ApplicationReviewRole
  riskRating: ApplicationRiskRating | 'all'
}

export type ApplicationSortKey = 'status' | 'dueAt' | 'capital'

export type ApplicationRawDto = {
  id: string
  status?: string | null
  requestedCapital?: number | string | null
  currency?: string | null
  purpose?: string | null
  createdAt?: string | null
  updatedAt?: string | null
  submittedAt?: string | null
  dueAt?: string | null
  nextReviewer?: string | null
  riskRating?: string | null
  evidenceGapCount?: number | string | null
  opportunity?: {
    title?: string | null
    project?: {
      name?: string | null
    } | null
  } | null
  applicantUser?: {
    displayName?: string | null
    email?: string | null
  } | null
  evidenceChecklist?: {
    items?: Array<{
      status?: string | null
    }>
  } | null
  dueDiligenceReports?: Array<{
    status?: string | null
    riskRating?: string | null
    reviewerUser?: {
      displayName?: string | null
      email?: string | null
    } | null
  }>
  shariahReviews?: Array<{
    status?: string | null
    reviewerUser?: {
      displayName?: string | null
      email?: string | null
    } | null
  }>
}
