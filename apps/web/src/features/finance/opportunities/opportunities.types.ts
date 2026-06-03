export type OpportunitySourceType =
  | 'buyer_purchase_order'
  | 'contract_award'
  | 'sales_order'
  | 'tender_result'
  | 'equivalent_revenue_document'

export type ProcurementOpportunityStatus =
  | 'draft'
  | 'ready_for_application'
  | 'application_created'
  | 'cancelled'
  | 'ineligible'

export type ProcurementOpportunity = {
  id: string
  title: string
  sourceType: OpportunitySourceType
  sourceDocumentId: string
  buyerName: string
  expectedRevenueAmount: number
  expectedCostAmount: number
  requestedCapitalAmount: number
  currency: string
  isRevenueGenerating: boolean
  status: ProcurementOpportunityStatus
  projectName?: string | null
  evidencePackTitle?: string | null
  applicationCount: number
}

export type CreateOpportunityFormValues = {
  projectId: string
  purchaseOrderId: string
  evidencePackId: string
  title: string
  sourceType: OpportunitySourceType | ''
  sourceDocumentId: string
  buyerName: string
  expectedRevenueAmount: string
  expectedCostAmount: string
  requestedCapitalAmount: string
  currency: string
  isRevenueGenerating: boolean
  isRoutineInternalConsumption: boolean
}

export type CreateOpportunityValidationResult = {
  ok: boolean
  errors: Partial<Record<keyof CreateOpportunityFormValues | 'form', string>>
}

export type OpportunityRawDto = {
  id: string
  title: string
  description?: string | null
  status?: string | null
  estimatedCapital?: number | string | null
  expectedProfit?: number | string | null
  currency?: string | null
  project?: {
    name?: string | null
  } | null
  evidencePack?: {
    title?: string | null
  } | null
  purchaseOrder?: {
    id?: string | null
    poNumber?: string | null
    status?: string | null
    totalAmount?: number | string | null
    supplier?: {
      name?: string | null
    } | null
  } | null
  applications?: Array<{
    id: string
  }>
}

export type ProjectOption = {
  id: string
  name: string
  budget?: number | string | null
}

export type PurchaseOrderOption = {
  id: string
  poNumber: string
  status: string
  totalAmount?: number | string | null
  supplier?: {
    name?: string | null
  } | null
}

export type EvidencePackOption = {
  id: string
  title: string
  status?: string | null
}
