import type {
  CreateOpportunityFormValues,
  CreateOpportunityValidationResult,
  OpportunityRawDto,
  OpportunitySourceType,
  ProcurementOpportunity,
} from './opportunities.types'
import type { AppRoleCode } from '../../../shared/types'

export const opportunitySourceLabels: Record<OpportunitySourceType, string> = {
  buyer_purchase_order: 'Buyer purchase order',
  contract_award: 'Contract award',
  sales_order: 'Sales order',
  tender_result: 'Tender result',
  equivalent_revenue_document: 'Equivalent revenue document',
}

const eligibleSourceTypes = new Set<OpportunitySourceType>([
  'buyer_purchase_order',
  'contract_award',
  'sales_order',
  'tender_result',
  'equivalent_revenue_document',
])

export function validateOpportunityInput(
  values: CreateOpportunityFormValues,
): CreateOpportunityValidationResult {
  const errors: CreateOpportunityValidationResult['errors'] = {}
  const expectedRevenueAmount = toNumber(values.expectedRevenueAmount)
  const expectedCostAmount = toNumber(values.expectedCostAmount)
  const requestedCapitalAmount = toNumber(values.requestedCapitalAmount)

  if (!values.projectId) {
    errors.projectId = 'Select the procurement project for this opportunity.'
  }

  if (!values.title.trim()) {
    errors.title = 'Opportunity title is required.'
  }

  if (!values.sourceType || !eligibleSourceTypes.has(values.sourceType)) {
    errors.sourceType = 'Select a revenue-generating source document type.'
  }

  if (!values.sourceDocumentId.trim()) {
    errors.sourceDocumentId = 'Enter the buyer PO, contract, sales order, tender, or equivalent document reference.'
  }

  if (!values.buyerName.trim()) {
    errors.buyerName = 'Buyer identity is required.'
  }

  if (expectedRevenueAmount <= 0) {
    errors.expectedRevenueAmount = 'Expected revenue must be greater than zero.'
  }

  if (expectedCostAmount <= 0) {
    errors.expectedCostAmount = 'Expected cost must be greater than zero.'
  }

  if (requestedCapitalAmount <= 0) {
    errors.requestedCapitalAmount = 'Requested capital must be greater than zero.'
  }

  if (expectedRevenueAmount > 0 && expectedCostAmount >= expectedRevenueAmount) {
    errors.expectedRevenueAmount =
      'Expected revenue must exceed expected cost for a measurable mudarabah margin.'
  }

  if (values.isRoutineInternalConsumption) {
    errors.form =
      'Routine internal consumption cannot proceed as a mudarabah opportunity.'
  }

  if (!values.isRevenueGenerating) {
    errors.form =
      'Mudarabah opportunities require external buyer demand and separately measurable revenue.'
  }

  return {
    ok: Object.keys(errors).length === 0,
    errors,
  }
}

export function buildOpportunityCreatePayload(
  values: CreateOpportunityFormValues,
  organizationId: string,
  actorUserId?: string | null,
) {
  const expectedRevenueAmount = toNumber(values.expectedRevenueAmount)
  const expectedCostAmount = toNumber(values.expectedCostAmount)
  const requestedCapitalAmount = toNumber(values.requestedCapitalAmount)

  return {
    organizationId,
    actorUserId: actorUserId || undefined,
    projectId: values.projectId,
    purchaseOrderId: values.purchaseOrderId || undefined,
    evidencePackId: values.evidencePackId || undefined,
    title: values.title.trim(),
    description: [
      `Source: ${values.sourceType}`,
      `Source document: ${values.sourceDocumentId.trim()}`,
      `Buyer: ${values.buyerName.trim()}`,
      `Expected revenue: ${expectedRevenueAmount}`,
      `Expected cost: ${expectedCostAmount}`,
      'Eligibility: revenue-generating opportunity',
    ].join('\n'),
    estimatedCapital: requestedCapitalAmount,
    expectedProfit: Math.max(expectedRevenueAmount - expectedCostAmount, 0),
    currency: values.currency || 'MYR',
  }
}

export function buildDraftApplicationPayload(
  opportunity: ProcurementOpportunity,
  organizationId: string,
  actorUserId?: string | null,
) {
  return {
    organizationId,
    actorUserId: actorUserId || undefined,
    opportunityId: opportunity.id,
    applicantUserId: actorUserId || undefined,
    requestedCapital: opportunity.requestedCapitalAmount,
    capitalProviderRatio: 0.6,
    entrepreneurRatio: 0.4,
    currency: opportunity.currency,
    purpose: `Restricted procurement working capital for ${opportunity.sourceDocumentId}`,
  }
}

export function mapOpportunity(raw: OpportunityRawDto): ProcurementOpportunity {
  const parsed = parseDescription(raw.description)
  const expectedProfit = toNumber(raw.expectedProfit)
  const requestedCapitalAmount = toNumber(raw.estimatedCapital)
  const expectedCostAmount = parsed.expectedCost || requestedCapitalAmount
  const expectedRevenueAmount =
    parsed.expectedRevenue || expectedCostAmount + expectedProfit
  const isRevenueGenerating =
    parsed.eligibility.includes('revenue-generating') ||
    expectedRevenueAmount > expectedCostAmount

  return {
    id: raw.id,
    title: raw.title,
    sourceType: parsed.sourceType,
    sourceDocumentId:
      parsed.sourceDocumentId ||
      raw.purchaseOrder?.poNumber ||
      'Source document not captured',
    buyerName: parsed.buyerName || 'Buyer not captured',
    expectedRevenueAmount,
    expectedCostAmount,
    requestedCapitalAmount,
    currency: raw.currency || 'MYR',
    isRevenueGenerating,
    status: mapOpportunityStatus(raw.status, raw.applications?.length ?? 0),
    projectName: raw.project?.name,
    evidencePackTitle: raw.evidencePack?.title,
    applicationCount: raw.applications?.length ?? 0,
  }
}

export function mapOpportunities(raw: readonly OpportunityRawDto[]) {
  return raw.map(mapOpportunity)
}

export function canCreateDraftApplication(opportunity: ProcurementOpportunity) {
  return (
    opportunity.status === 'ready_for_application' &&
    opportunity.isRevenueGenerating &&
    opportunity.applicationCount === 0
  )
}

export function defaultOpportunityValues(): CreateOpportunityFormValues {
  return {
    projectId: '',
    purchaseOrderId: '',
    evidencePackId: '',
    title: 'Revenue-backed procurement opportunity',
    sourceType: '',
    sourceDocumentId: '',
    buyerName: '',
    expectedRevenueAmount: '',
    expectedCostAmount: '',
    requestedCapitalAmount: '',
    currency: 'MYR',
    isRevenueGenerating: true,
    isRoutineInternalConsumption: false,
  }
}

export function canCreateOpportunity(roleCodes: readonly AppRoleCode[]) {
  return roleCodes.some((roleCode) =>
    ['ORG_ADMIN'].includes(roleCode),
  )
}

export function canViewOpportunities(roleCodes: readonly AppRoleCode[]) {
  return roleCodes.some((roleCode) =>
    [
      'ORG_ADMIN',
      'FINANCE_ACCOUNTANT',
      'FINANCIER_USER',
    ].includes(roleCode),
  )
}

function mapOpportunityStatus(
  status?: string | null,
  applicationCount = 0,
): ProcurementOpportunity['status'] {
  const normalized = (status || '').toUpperCase()

  if (normalized === 'INELIGIBLE') {
    return 'ineligible'
  }

  if (normalized === 'CLOSED') {
    return 'cancelled'
  }

  if (applicationCount > 0 || normalized === 'APPLICATION_DRAFTED') {
    return 'application_created'
  }

  return 'ready_for_application'
}

function parseDescription(description?: string | null) {
  const values = new Map<string, string>()

  for (const line of description?.split('\n') ?? []) {
    const separatorIndex = line.indexOf(':')

    if (separatorIndex === -1) {
      continue
    }

    values.set(
      line.slice(0, separatorIndex).trim().toLowerCase(),
      line.slice(separatorIndex + 1).trim(),
    )
  }

  const sourceType = values.get('source') as OpportunitySourceType | undefined

  return {
    sourceType:
      sourceType && eligibleSourceTypes.has(sourceType)
        ? sourceType
        : 'equivalent_revenue_document',
    sourceDocumentId: values.get('source document') ?? '',
    buyerName: values.get('buyer') ?? '',
    expectedRevenue: toNumber(values.get('expected revenue')),
    expectedCost: toNumber(values.get('expected cost')),
    eligibility: values.get('eligibility')?.toLowerCase() ?? '',
  }
}

function toNumber(value?: number | string | null) {
  const numberValue = Number(value ?? 0)
  return Number.isFinite(numberValue) ? numberValue : 0
}
