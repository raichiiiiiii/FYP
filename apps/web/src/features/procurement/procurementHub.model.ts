export type HubRequisition = {
  id: string
  status: string
  totalAmount?: number | string | null
}

export type HubSupplier = {
  id: string
  name: string
  status: string
}

export type HubPurchaseOrder = {
  id: string
  poNumber: string
  status: string
  totalAmount?: number | string | null
  supplier?: { name?: string | null } | null
  receipts?: unknown[]
  invoices?: { amount?: number | string | null; status?: string | null }[]
}

export type HubMatchingRecord = {
  purchaseOrder: Pick<HubPurchaseOrder, 'id' | 'poNumber' | 'supplier'>
  receiptCount: number
  invoiceCount: number
  invoiceTotal?: number | string | null
  amountMatches: boolean
  matchingStatus: string
}

export type HubApprovalTask = {
  id: string
  status: string
}

export type HubRfq = {
  id: string
  status: string
}

export type HubQuotation = {
  id: string
  status: string
  totalAmount?: number | string | null
}

export type ProcurementHubInput = {
  requisitions: readonly HubRequisition[]
  suppliers: readonly HubSupplier[]
  purchaseOrders: readonly HubPurchaseOrder[]
  matchingRecords: readonly HubMatchingRecord[]
  approvalTasks: readonly HubApprovalTask[]
  rfqs: readonly HubRfq[]
  quotations: readonly HubQuotation[]
}

export type ProcurementHubSummary = {
  totalRequisitions: number
  pendingApproval: number
  approvedRequisitions: number
  openPurchaseOrders: number
  matchedRecords: number
  matchExceptions: number
  activeSuppliers: number
  totalCommittedValue: number
  activeRfqs: number
  quotationsReceived: number
}

const openPurchaseOrderStatuses = new Set([
  'DRAFT',
  'SUBMITTED',
  'ISSUED',
  'ACKNOWLEDGED',
  'PARTIALLY_RECEIVED',
  'RECEIVED',
  'BILLED',
])

const activeSupplierStatuses = new Set(['ACTIVE', 'APPROVED'])

export function normalizeHubStatus(status?: string | null) {
  return (status ?? '').trim().toUpperCase()
}

export function toHubNumber(value?: number | string | null) {
  const numberValue = Number(value ?? 0)
  return Number.isFinite(numberValue) ? numberValue : 0
}

export function isMatchException(record: HubMatchingRecord) {
  const status = normalizeHubStatus(record.matchingStatus)

  return (
    status.includes('EXCEPTION') ||
    status.includes('MISMATCH') ||
    record.amountMatches === false
  )
}

export function summarizeProcurementHub(
  input: ProcurementHubInput,
): ProcurementHubSummary {
  return {
    totalRequisitions: input.requisitions.length,
    pendingApproval:
      input.requisitions.filter(
        (requisition) => normalizeHubStatus(requisition.status) === 'SUBMITTED',
      ).length +
      input.approvalTasks.filter(
        (task) => normalizeHubStatus(task.status) === 'PENDING',
      ).length,
    approvedRequisitions: input.requisitions.filter(
      (requisition) => normalizeHubStatus(requisition.status) === 'APPROVED',
    ).length,
    openPurchaseOrders: input.purchaseOrders.filter((purchaseOrder) =>
      openPurchaseOrderStatuses.has(normalizeHubStatus(purchaseOrder.status)),
    ).length,
    matchedRecords: input.matchingRecords.filter(
      (record) =>
        !isMatchException(record) &&
        normalizeHubStatus(record.matchingStatus).includes('MATCH'),
    ).length,
    matchExceptions: input.matchingRecords.filter(isMatchException).length,
    activeSuppliers: input.suppliers.filter((supplier) =>
      activeSupplierStatuses.has(normalizeHubStatus(supplier.status)),
    ).length,
    totalCommittedValue: input.purchaseOrders.reduce(
      (total, purchaseOrder) => total + toHubNumber(purchaseOrder.totalAmount),
      0,
    ),
    activeRfqs: input.rfqs.filter((rfq) =>
      ['DRAFT', 'PUBLISHED', 'QUOTATION_RECEIVING'].includes(
        normalizeHubStatus(rfq.status),
      ),
    ).length,
    quotationsReceived: input.quotations.length,
  }
}
