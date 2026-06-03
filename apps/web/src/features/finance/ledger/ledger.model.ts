import type {
  LedgerEntryType,
  LedgerEvidenceLink,
  LossException,
  ProfitDistribution,
  ProfitLossStatementRawDto,
  ProfitLossStatus,
  ProfitLossSummary,
  ProjectLedgerEntry,
  ProjectLedgerEntryRawDto,
} from './ledger.types'

const revenueTypes = new Set<LedgerEntryType>(['buyer_receipt'])
const allowedCostTypes = new Set<LedgerEntryType>([
  'supplier_payment',
  'allowed_expense',
])
const capitalTypes = new Set<LedgerEntryType>(['capital_disbursement'])

export function normalizeLedgerEntryType(value?: string | null): LedgerEntryType {
  const normalized = (value || '').trim().toUpperCase()

  if (normalized === 'CAPITAL' || normalized === 'CAPITAL_DISBURSEMENT') {
    return 'capital_disbursement'
  }

  if (normalized === 'REVENUE' || normalized === 'INCOME' || normalized === 'BUYER_RECEIPT') {
    return 'buyer_receipt'
  }

  if (normalized === 'COST' || normalized === 'SUPPLIER_PAYMENT') {
    return 'supplier_payment'
  }

  if (normalized === 'EXPENSE' || normalized === 'ALLOWED_EXPENSE') {
    return 'allowed_expense'
  }

  if (normalized === 'PROFIT_DISTRIBUTION') {
    return 'profit_distribution'
  }

  if (normalized === 'LOSS_RECOGNITION') {
    return 'loss_recognition'
  }

  return 'adjustment'
}

export function displayLedgerEntryType(type: LedgerEntryType) {
  const labels: Record<LedgerEntryType, string> = {
    capital_disbursement: 'Capital disbursement',
    supplier_payment: 'Supplier payment',
    allowed_expense: 'Allowed expense',
    buyer_receipt: 'Buyer receipt',
    adjustment: 'Adjustment',
    profit_distribution: 'Profit distribution',
    loss_recognition: 'Loss recognition',
  }

  return labels[type]
}

export function mapLedgerEntry(entry: ProjectLedgerEntryRawDto): ProjectLedgerEntry {
  const type = normalizeLedgerEntryType(entry.entryType)
  const sourceDocumentId =
    safeText(entry.sourceDocumentId) || safeText(entry.sourceDocument?.id)

  return {
    id: entry.id,
    applicationId: entry.applicationId,
    type,
    rawEntryType: entry.entryType || type,
    amount: toNumber(entry.amount),
    currency: entry.currency || 'MYR',
    occurredAt: entry.occurredAt || '',
    sourceDocumentId: sourceDocumentId || undefined,
    sourceDocumentLabel:
      safeText(entry.sourceDocument?.documentNumber) ||
      safeText(entry.sourceDocument?.title) ||
      sourceDocumentId ||
      undefined,
    description: entry.description || 'Ledger entry',
  }
}

export function calculateProfitLossSummary({
  applicationId,
  entries,
  currency = 'MYR',
  profitShareRatio,
  status,
  lossExceptions = [],
}: {
  applicationId: string
  entries: ProjectLedgerEntry[]
  currency?: string
  profitShareRatio: ProfitLossSummary['profitShareRatio']
  status?: ProfitLossStatus
  lossExceptions?: LossException[]
}): ProfitLossSummary {
  const totalRevenue = sumEntries(entries, revenueTypes)
  const totalAllowedCost = sumEntries(entries, allowedCostTypes)
  const netProfitOrLoss = totalRevenue - totalAllowedCost
  const distribution = buildProfitDistribution(
    netProfitOrLoss,
    profitShareRatio,
  )

  return {
    applicationId,
    totalRevenue,
    totalAllowedCost,
    netProfitOrLoss,
    profitShareRatio,
    distribution,
    status:
      status ||
      (lossExceptions.length
        ? 'loss_exception'
        : netProfitOrLoss < 0
          ? 'review_required'
          : 'preliminary'),
    currency,
    lossExceptions,
    evidenceLineage: buildEvidenceLineage(entries),
  }
}

export function mapProfitLossStatement(
  statement: ProfitLossStatementRawDto,
): ProfitLossSummary {
  const application = statement.application
  const profitShareRatio = {
    rabbUlMal: toNumber(application?.capitalProviderRatio, 0.6),
    mudarib: toNumber(application?.entrepreneurRatio, 0.4),
  }
  const netProfitOrLoss = toNumber(statement.netProfit)
  const mappedLossExceptions =
    statement.lossExceptions?.map((exception) => ({
      id: exception.id,
      exceptionType: exception.exceptionType || 'BUSINESS_LOSS',
      amount: Math.abs(toNumber(exception.amount)),
      notes: exception.notes,
    })) ?? []
  const distribution = mapStatementDistribution(
    statement.distributions,
    netProfitOrLoss,
    profitShareRatio,
  )

  return {
    applicationId: statement.applicationId,
    totalRevenue: toNumber(statement.revenue),
    totalAllowedCost: toNumber(statement.costs),
    netProfitOrLoss,
    profitShareRatio,
    distribution,
    status: normalizeProfitLossStatus(
      statement.status,
      netProfitOrLoss,
      mappedLossExceptions,
    ),
    currency: application?.currency || 'MYR',
    lossExceptions: mappedLossExceptions,
    evidenceLineage: [],
  }
}

export function buildProfitDistribution(
  netProfitOrLoss: number,
  ratio: ProfitLossSummary['profitShareRatio'],
) {
  if (netProfitOrLoss <= 0) {
    return undefined
  }

  const totalRatio = ratio.rabbUlMal + ratio.mudarib

  if (totalRatio <= 0) {
    return undefined
  }

  return {
    rabbUlMalAmount: (netProfitOrLoss * ratio.rabbUlMal) / totalRatio,
    mudaribAmount: (netProfitOrLoss * ratio.mudarib) / totalRatio,
  }
}

export function hasGuaranteedFixedReturnPattern({
  summary,
  fixedReturnAmount,
  fixedReturnRate,
}: {
  summary: ProfitLossSummary
  fixedReturnAmount?: number
  fixedReturnRate?: number
}) {
  const explicitFixedReturn =
    toNumber(fixedReturnAmount) > 0 || toNumber(fixedReturnRate) > 0
  const distributionWithoutProfit =
    summary.netProfitOrLoss <= 0 &&
    Boolean(
      summary.distribution &&
        (summary.distribution.rabbUlMalAmount > 0 ||
          summary.distribution.mudaribAmount > 0),
    )

  return explicitFixedReturn || distributionWithoutProfit
}

export function getProfitLossFinding(summary: ProfitLossSummary) {
  if (summary.status === 'loss_exception') {
    return 'Loss exception review is required before closure. Genuine loss is not converted into a guaranteed financier return.'
  }

  if (summary.netProfitOrLoss < 0) {
    return 'Genuine loss display: no profit distribution is calculated. Reviewer must classify business loss versus breach, negligence, misconduct, or fraud.'
  }

  if (summary.netProfitOrLoss === 0) {
    return 'Break-even display: no profit distribution is calculated because there is no realized profit.'
  }

  return 'Positive profit display: distribution is calculated only from realized net profit using the approved ratio.'
}

export function buildEvidenceLineage(entries: ProjectLedgerEntry[]): LedgerEvidenceLink[] {
  return entries.flatMap((entry) => {
    if (!entry.sourceDocumentId) {
      return []
    }

    return [
      {
        id: `${entry.id}:${entry.sourceDocumentId}`,
        label: entry.sourceDocumentLabel || entry.sourceDocumentId,
        role: evidenceRoleForEntry(entry.type),
        entryId: entry.id,
      },
    ]
  })
}

export function displayDistributionParty(distribution: ProfitDistribution) {
  return distribution.label
}

function sumEntries(entries: ProjectLedgerEntry[], types: Set<LedgerEntryType>) {
  return entries.reduce((total, entry) => {
    if (!types.has(entry.type)) {
      return total
    }

    return total + Math.abs(entry.amount)
  }, 0)
}

function mapStatementDistribution(
  distributions: ProfitLossStatementRawDto['distributions'],
  netProfitOrLoss: number,
  profitShareRatio: ProfitLossSummary['profitShareRatio'],
) {
  if (netProfitOrLoss <= 0) {
    return undefined
  }

  if (!distributions?.length) {
    return buildProfitDistribution(netProfitOrLoss, profitShareRatio)
  }

  const mapped = distributions.map(mapDistribution)

  return {
    rabbUlMalAmount:
      mapped.find((distribution) => distribution.party === 'rabb_ul_mal')
        ?.amount ?? 0,
    mudaribAmount:
      mapped.find((distribution) => distribution.party === 'mudarib')?.amount ??
      0,
  }
}

function mapDistribution(distribution: NonNullable<ProfitLossStatementRawDto['distributions']>[number]): ProfitDistribution {
  const party = normalizeDistributionParty(distribution.party)

  return {
    party,
    label: party === 'rabb_ul_mal' ? 'Rabb-ul-Mal' : party === 'mudarib' ? 'Mudarib' : 'Unknown party',
    ratio: toNumber(distribution.ratio),
    amount: toNumber(distribution.amount),
  }
}

function normalizeDistributionParty(party?: string | null): ProfitDistribution['party'] {
  const normalized = (party || '').trim().toUpperCase()

  if (normalized === 'CAPITAL_PROVIDER' || normalized === 'RABB_UL_MAL') {
    return 'rabb_ul_mal'
  }

  if (normalized === 'ENTREPRENEUR' || normalized === 'MUDARIB') {
    return 'mudarib'
  }

  return 'unknown'
}

function normalizeProfitLossStatus(
  status: string | null | undefined,
  netProfitOrLoss: number,
  lossExceptions: LossException[],
): ProfitLossStatus {
  const normalized = (status || '').trim().toUpperCase()

  if (normalized === 'APPROVED') {
    return 'approved'
  }

  if (normalized === 'LOSS_EXCEPTION' || lossExceptions.length) {
    return 'loss_exception'
  }

  if (normalized === 'REVIEW_REQUIRED' || netProfitOrLoss < 0) {
    return 'review_required'
  }

  return 'preliminary'
}

function evidenceRoleForEntry(type: LedgerEntryType): LedgerEvidenceLink['role'] {
  if (revenueTypes.has(type)) {
    return 'revenue'
  }

  if (allowedCostTypes.has(type)) {
    return 'allowed_cost'
  }

  if (capitalTypes.has(type)) {
    return 'capital'
  }

  return 'other'
}

function safeText(value?: string | null) {
  return value?.trim() || ''
}

function toNumber(value?: number | string | null, fallback = 0) {
  const numberValue = Number(value ?? fallback)
  return Number.isFinite(numberValue) ? numberValue : fallback
}
