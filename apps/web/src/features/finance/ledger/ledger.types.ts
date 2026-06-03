export type LedgerEntryType =
  | 'capital_disbursement'
  | 'supplier_payment'
  | 'allowed_expense'
  | 'buyer_receipt'
  | 'adjustment'
  | 'profit_distribution'
  | 'loss_recognition'

export type ProjectLedgerEntry = {
  id: string
  applicationId: string
  type: LedgerEntryType
  rawEntryType: string
  amount: number
  currency: string
  occurredAt: string
  sourceDocumentId?: string
  sourceDocumentLabel?: string
  description: string
}

export type ProjectLedgerEntryRawDto = {
  id: string
  applicationId: string
  entryType?: string | null
  amount?: number | string | null
  currency?: string | null
  occurredAt?: string | null
  sourceDocumentId?: string | null
  sourceDocument?: {
    id?: string | null
    title?: string | null
    documentNumber?: string | null
  } | null
  description?: string | null
}

export type ProfitDistribution = {
  party: 'rabb_ul_mal' | 'mudarib' | 'unknown'
  label: string
  ratio: number
  amount: number
}

export type LossException = {
  id?: string
  exceptionType: string
  amount: number
  notes?: string | null
}

export type ProfitLossStatus =
  | 'preliminary'
  | 'review_required'
  | 'approved'
  | 'loss_exception'

export type ProfitLossSummary = {
  applicationId: string
  totalRevenue: number
  totalAllowedCost: number
  netProfitOrLoss: number
  profitShareRatio: {
    rabbUlMal: number
    mudarib: number
  }
  distribution?: {
    rabbUlMalAmount: number
    mudaribAmount: number
  }
  status: ProfitLossStatus
  currency: string
  lossExceptions: LossException[]
  evidenceLineage: LedgerEvidenceLink[]
}

export type ProfitLossStatementRawDto = {
  id?: string
  applicationId: string
  revenue?: number | string | null
  costs?: number | string | null
  netProfit?: number | string | null
  status?: string | null
  createdAt?: string | null
  distributions?: Array<{
    id?: string
    party?: string | null
    ratio?: number | string | null
    amount?: number | string | null
  }>
  lossExceptions?: Array<{
    id?: string
    exceptionType?: string | null
    amount?: number | string | null
    notes?: string | null
  }>
  application?: {
    capitalProviderRatio?: number | string | null
    entrepreneurRatio?: number | string | null
    currency?: string | null
  } | null
}

export type LedgerEvidenceLink = {
  id: string
  label: string
  role: 'revenue' | 'allowed_cost' | 'capital' | 'other'
  entryId: string
}

export type LedgerEntryGroup = {
  id: 'revenue' | 'allowed_cost' | 'capital' | 'other'
  title: string
  description: string
  entries: ProjectLedgerEntry[]
}
