type ChecklistItemLike = {
  status: string
}

type EvidenceChecklistLike = {
  items?: ChecklistItemLike[]
} | null | undefined

type LedgerEntryLike = {
  amount: number
  entryType: string
}

type LedgerApplicationLike = {
  ledgerEntries?: LedgerEntryLike[]
}

type FinanceRoleScopeLike = {
  canSubmitEvidence: boolean
  canReviewFinance: boolean
  canReviewShariah: boolean
  canCreateContract: boolean
  isAuditor: boolean
}

export function displayFinanceState(status?: string | null) {
  return (status || 'PENDING').replace(/_/g, ' ')
}

export function formatRatio(value?: number | null) {
  return `${Math.round((Number(value ?? 0) || 0) * 100)}%`
}

export function summarizeChecklist(checklist?: EvidenceChecklistLike) {
  const items = checklist?.items ?? []
  const completed = items.filter((item) => item.status === 'COMPLETED').length
  const waived = items.filter((item) => item.status === 'WAIVED').length
  const rejected = items.filter((item) => item.status === 'REJECTED').length
  const missing = items.filter(
    (item) => !['COMPLETED', 'WAIVED'].includes(item.status),
  ).length
  const readyCount = completed + waived
  const progress = items.length ? Math.round((readyCount / items.length) * 100) : 0

  return {
    completed,
    waived,
    rejected,
    missing,
    total: items.length,
    progress,
    readyCount,
  }
}

export function summarizeWorkspaceLedger(application: LedgerApplicationLike) {
  const entries = application.ledgerEntries ?? []
  const revenue = entries
    .filter((entry) => entry.entryType === 'REVENUE')
    .reduce((sum, entry) => sum + Number(entry.amount || 0), 0)
  const costs = entries
    .filter((entry) => ['COST', 'EXPENSE'].includes(entry.entryType))
    .reduce((sum, entry) => sum + Math.abs(Number(entry.amount || 0)), 0)
  const capital = entries
    .filter((entry) => entry.entryType === 'CAPITAL')
    .reduce((sum, entry) => sum + Number(entry.amount || 0), 0)

  return {
    capital,
    costs,
    entries: entries.length,
    net: revenue - costs,
    revenue,
  }
}

export function buildWorkspaceRoleGuidance(
  roleScope: FinanceRoleScopeLike,
  status: string,
  evidence: ReturnType<typeof summarizeChecklist>,
) {
  if (roleScope.isAuditor) {
    return {
      title: 'Auditor workspace is read-only',
      message:
        'Review evidence, approvals, ledger records, closure state, and audit links without finance mutation controls.',
    }
  }

  if (roleScope.canSubmitEvidence && ['SUBMITTED', 'EVIDENCE_PENDING'].includes(status)) {
    return {
      title: 'Evidence owner action',
      message:
        evidence.missing > 0
          ? `${evidence.missing} checklist item(s) still block review readiness.`
          : 'Checklist evidence is complete or waived; reviewer gates can proceed.',
    }
  }

  if (roleScope.canReviewFinance && status === 'DUE_DILIGENCE_IN_REVIEW') {
    return {
      title: 'Financier review gate',
      message:
        'Review buyer demand, supplier reliability, cost reasonableness, and repayment/profit realization assumptions before recording a decision.',
    }
  }

  if (roleScope.canReviewShariah && status === 'SHARIAH_IN_REVIEW') {
    return {
      title: 'Shariah/compliance gate',
      message:
        'Review eligible activity, profit ratio, loss treatment, restricted use, and guaranteed-return prohibition.',
    }
  }

  if (roleScope.canCreateContract && status === 'APPROVED') {
    return {
      title: 'Contract gate ready',
      message:
        'Both review gates are approved. Generate the restricted contract only from backend-approved terms.',
    }
  }

  return {
    title: 'Workspace status',
    message:
      'The visible actions are controlled by role, application state, and backend validation. Disabled actions show the next required gate.',
  }
}

export function blockedReason(enabled: boolean, reason: string) {
  return enabled ? null : reason
}
