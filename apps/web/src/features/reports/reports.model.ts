export type ReportCategory = 'procurement' | 'finance' | 'audit' | 'integration'

export type ReportStatus = 'api_backed' | 'partial' | 'blocked'

export type ReportRecord = Record<string, unknown>

export type ReportsData = {
  projects: ReportRecord[]
  suppliers: ReportRecord[]
  requisitions: ReportRecord[]
  rfqs: ReportRecord[]
  quotations: ReportRecord[]
  purchaseOrders: ReportRecord[]
  matchingRecords: ReportRecord[]
  opportunities: ReportRecord[]
  applications: ReportRecord[]
  contracts: ReportRecord[]
  ledgerEntries: ReportRecord[]
  profitLossStatements: ReportRecord[]
  closures: ReportRecord[]
  auditEvents: ReportRecord[]
  outboxEvents: ReportRecord[]
  reconciliationRecords: ReportRecord[]
  webhookSubscriptions: ReportRecord[]
}

export type ReportSummary = {
  procurementRecords: number
  financeRecords: number
  auditEvents: number
  integrationRecords: number
  blockedExports: number
}

export type ReportCard = {
  id: string
  category: ReportCategory
  title: string
  description: string
  status: ReportStatus
  primaryMetric: string
  secondaryMetric: string
  source: string
  route: string
  exportStatus: 'not_available'
}

const emptyReportsData: ReportsData = {
  projects: [],
  suppliers: [],
  requisitions: [],
  rfqs: [],
  quotations: [],
  purchaseOrders: [],
  matchingRecords: [],
  opportunities: [],
  applications: [],
  contracts: [],
  ledgerEntries: [],
  profitLossStatements: [],
  closures: [],
  auditEvents: [],
  outboxEvents: [],
  reconciliationRecords: [],
  webhookSubscriptions: [],
}

export function createEmptyReportsData(): ReportsData {
  return { ...emptyReportsData }
}

export function summarizeReports(data: ReportsData): ReportSummary {
  const procurementRecords =
    data.projects.length +
    data.suppliers.length +
    data.requisitions.length +
    data.rfqs.length +
    data.quotations.length +
    data.purchaseOrders.length +
    data.matchingRecords.length
  const financeRecords =
    data.opportunities.length +
    data.applications.length +
    data.contracts.length +
    data.ledgerEntries.length +
    data.profitLossStatements.length +
    data.closures.length
  const integrationRecords =
    data.outboxEvents.length +
    data.reconciliationRecords.length +
    data.webhookSubscriptions.length

  return {
    procurementRecords,
    financeRecords,
    auditEvents: data.auditEvents.length,
    integrationRecords,
    blockedExports: buildReportCards(data).filter(
      (card) => card.exportStatus === 'not_available',
    ).length,
  }
}

export function buildReportCards(data: ReportsData): ReportCard[] {
  return [
    {
      id: 'procurement-source-to-pay',
      category: 'procurement',
      title: 'Procurement source-to-pay',
      description:
        'Projects, suppliers, requisitions, RFQs, quotations, purchase orders, and matching records visible to the current organization.',
      status: statusFromCount(
        data.requisitions.length + data.purchaseOrders.length,
        data.matchingRecords.length,
      ),
      primaryMetric: `${data.requisitions.length} requisitions`,
      secondaryMetric: `${data.purchaseOrders.length} purchase orders / ${data.matchingRecords.length} matching records`,
      source: 'API-backed procurement list endpoints',
      route: '/procurement/requisitions',
      exportStatus: 'not_available',
    },
    {
      id: 'procurement-sourcing',
      category: 'procurement',
      title: 'Sourcing and supplier coverage',
      description:
        'Supplier, RFQ, and quotation coverage for reviewers checking whether procurement evidence is ready for financing.',
      status: statusFromCount(
        data.suppliers.length + data.rfqs.length + data.quotations.length,
      ),
      primaryMetric: `${data.suppliers.length} suppliers`,
      secondaryMetric: `${data.rfqs.length} RFQs / ${data.quotations.length} quotations`,
      source: 'API-backed supplier and sourcing lists',
      route: '/procurement/suppliers',
      exportStatus: 'not_available',
    },
    {
      id: 'finance-pipeline',
      category: 'finance',
      title: 'Mudarabah finance pipeline',
      description:
        'Opportunity, application, contract, ledger, profit/loss, and closure records for the current organization.',
      status: statusFromCount(
        data.opportunities.length + data.applications.length,
        data.contracts.length + data.closures.length,
      ),
      primaryMetric: `${data.applications.length} applications`,
      secondaryMetric: `${data.opportunities.length} opportunities / ${data.contracts.length} contracts`,
      source: 'API-backed finance list endpoints',
      route: '/finance/applications',
      exportStatus: 'not_available',
    },
    {
      id: 'finance-ledger-pl',
      category: 'finance',
      title: 'Ledger and profit/loss evidence',
      description:
        'Project ledger and P/L statement counts. This report does not calculate guaranteed fixed returns.',
      status: statusFromCount(
        data.ledgerEntries.length + data.profitLossStatements.length,
      ),
      primaryMetric: `${data.ledgerEntries.length} ledger entries`,
      secondaryMetric: `${data.profitLossStatements.length} P/L statements / ${data.closures.length} closures`,
      source: 'API-backed ledger and P/L lists',
      route: '/finance/ledgers',
      exportStatus: 'not_available',
    },
    {
      id: 'audit-evidence',
      category: 'audit',
      title: 'Audit and evidence events',
      description:
        'Audit-event volume for reviewers. Hash, anchor, and closure verification must be checked in audit/evidence screens.',
      status: statusFromCount(data.auditEvents.length),
      primaryMetric: `${data.auditEvents.length} audit events`,
      secondaryMetric: 'Hash and anchor verification remains source-screen based',
      source: 'API-backed audit event list',
      route: '/audit/search',
      exportStatus: 'not_available',
    },
    {
      id: 'integration-outbox',
      category: 'integration',
      title: 'Integration outbox and reconciliation',
      description:
        'Outbox, reconciliation, and webhook records for mock adapter review. Completed mock records are not real provider health.',
      status: statusFromCount(
        data.outboxEvents.length,
        data.reconciliationRecords.length + data.webhookSubscriptions.length,
      ),
      primaryMetric: `${data.outboxEvents.length} outbox events`,
      secondaryMetric: `${data.reconciliationRecords.length} reconciliation / ${data.webhookSubscriptions.length} webhooks`,
      source: 'API-backed integration lists',
      route: '/integrations',
      exportStatus: 'not_available',
    },
  ]
}

export function reportStatusLabel(status: ReportStatus) {
  const labels: Record<ReportStatus, string> = {
    api_backed: 'API-backed',
    partial: 'Partial',
    blocked: 'Blocked',
  }

  return labels[status]
}

function statusFromCount(primaryCount: number, supportingCount = 0): ReportStatus {
  if (primaryCount > 0 && supportingCount > 0) {
    return 'api_backed'
  }

  if (primaryCount > 0) {
    return 'partial'
  }

  return 'blocked'
}
