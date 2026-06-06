export type ReportCategory =
  | 'procurement'
  | 'finance'
  | 'audit'
  | 'integrations'

export type ReportStatus = 'api_backed' | 'partial' | 'empty' | 'restricted'

export type ReportSectionStatus = 'ready' | 'empty' | 'restricted'

export type ReportSectionDto = {
  id: ReportCategory
  label: string
  total: number
  status: ReportSectionStatus
}

export type ReportsSummaryDto = {
  organizationId: string
  generatedAt: string
  sections: ReportSectionDto[]
  totals: {
    procurement: number
    finance: number
    audit: number
    integrations: number
  }
}

export type ProcurementReportDto = {
  organizationId: string
  generatedAt: string
  counts: {
    projects: number
    suppliers: number
    requisitions: number
    rfqs: number
    quotations: number
    purchaseOrders: number
    receipts: number
    invoices: number
    total: number
  }
  requisitionsByStatus: Record<string, number>
  purchaseOrdersByStatus: Record<string, number>
  invoicesByStatus: Record<string, number>
}

export type FinanceReportDto = {
  organizationId: string
  generatedAt: string
  counts: {
    opportunities: number
    applications: number
    contracts: number
    disbursements: number
    ledgerEntries: number
    profitLossStatements: number
    closures: number
    lossExceptions: number
    total: number
  }
  opportunitiesByStatus: Record<string, number>
  applicationsByStatus: Record<string, number>
  contractsByStatus: Record<string, number>
  disbursementsByStatus: Record<string, number>
}

export type AuditReportDto = {
  organizationId: string
  generatedAt: string
  counts: {
    events: number
    hashRecords: number
    anchors: number
    failedAnchors: number
    pendingAnchors: number
    total: number
  }
  anchorsByStatus: Record<string, number>
  hashRecordsByEntityType: Record<string, number>
}

export type IntegrationReportDto = {
  organizationId: string
  generatedAt: string
  counts: {
    outboxEvents: number
    outboxPending: number
    outboxFailed: number
    reconciliationRecords: number
    webhookSubscriptions: number
    workerHeartbeats: number
    total: number
  }
  outboxByStatus: Record<string, number>
  reconciliationByStatus: Record<string, number>
}

export type ReportDtoByCategory = {
  procurement?: ProcurementReportDto
  finance?: FinanceReportDto
  audit?: AuditReportDto
  integrations?: IntegrationReportDto
}

export type ReportsViewData = {
  summary: ReportsSummaryDto
  reports: ReportDtoByCategory
}

export type ReportSummary = {
  procurementRecords: number
  financeRecords: number
  auditRecords: number
  integrationRecords: number
  jsonExportsAvailable: number
  restrictedReports: number
}

export type ReportCard = {
  id: ReportCategory
  category: ReportCategory
  title: string
  description: string
  status: ReportStatus
  primaryMetric: string
  secondaryMetric: string
  source: string
  route: string
  exportStatus: 'available' | 'restricted'
}

export function summarizeReports(data: ReportsViewData): ReportSummary {
  const cards = buildReportCards(data)

  return {
    procurementRecords: data.summary.totals.procurement,
    financeRecords: data.summary.totals.finance,
    auditRecords: data.summary.totals.audit,
    integrationRecords: data.summary.totals.integrations,
    jsonExportsAvailable: cards.filter(
      (card) => card.exportStatus === 'available',
    ).length,
    restrictedReports: cards.filter((card) => card.status === 'restricted')
      .length,
  }
}

export function buildReportCards(data: ReportsViewData): ReportCard[] {
  return [
    procurementCard(data),
    financeCard(data),
    auditCard(data),
    integrationsCard(data),
  ]
}

export function reportStatusLabel(status: ReportStatus) {
  const labels: Record<ReportStatus, string> = {
    api_backed: 'API-backed',
    partial: 'Partial',
    empty: 'Empty',
    restricted: 'Restricted',
  }

  return labels[status]
}

function procurementCard(data: ReportsViewData): ReportCard {
  const report = data.reports.procurement

  return {
    id: 'procurement',
    category: 'procurement',
    title: 'Procurement source-to-pay',
    description:
      'Backend-owned procurement report covering projects, suppliers, requisitions, RFQs, quotations, purchase orders, receipts, and invoices.',
    status: statusFor(data, 'procurement', report),
    primaryMetric: `${report?.counts.requisitions ?? 0} requisitions`,
    secondaryMetric: `${report?.counts.purchaseOrders ?? 0} purchase orders / ${
      report?.counts.invoices ?? 0
    } invoices`,
    source: 'Reports API procurement DTO',
    route: '/procurement/requisitions',
    exportStatus: exportStatusFor(data, 'procurement'),
  }
}

function financeCard(data: ReportsViewData): ReportCard {
  const report = data.reports.finance

  return {
    id: 'finance',
    category: 'finance',
    title: 'Mudarabah finance pipeline',
    description:
      'Backend-owned finance report for opportunities, applications, contracts, ledger/P&L, closure, and loss exception counts. It does not calculate guaranteed fixed returns.',
    status: statusFor(data, 'finance', report),
    primaryMetric: `${report?.counts.applications ?? 0} applications`,
    secondaryMetric: `${report?.counts.contracts ?? 0} contracts / ${
      report?.counts.lossExceptions ?? 0
    } loss exceptions`,
    source: 'Reports API finance DTO',
    route: '/finance/applications',
    exportStatus: exportStatusFor(data, 'finance'),
  }
}

function auditCard(data: ReportsViewData): ReportCard {
  const report = data.reports.audit

  return {
    id: 'audit',
    category: 'audit',
    title: 'Audit and evidence integrity',
    description:
      'Backend-owned audit report covering audit events, hash records, and anchor status counts. Fabric verification remains source-record specific.',
    status: statusFor(data, 'audit', report),
    primaryMetric: `${report?.counts.events ?? 0} audit events`,
    secondaryMetric: `${report?.counts.hashRecords ?? 0} hash records / ${
      report?.counts.anchors ?? 0
    } anchors`,
    source: 'Reports API audit DTO',
    route: '/audit/search',
    exportStatus: exportStatusFor(data, 'audit'),
  }
}

function integrationsCard(data: ReportsViewData): ReportCard {
  const report = data.reports.integrations

  return {
    id: 'integrations',
    category: 'integrations',
    title: 'Integrations and operations',
    description:
      'Backend-owned integration report for outbox, reconciliation, webhook, and worker heartbeat records. Mock adapters remain labelled outside this report.',
    status: statusFor(data, 'integrations', report),
    primaryMetric: `${report?.counts.outboxEvents ?? 0} outbox events`,
    secondaryMetric: `${report?.counts.reconciliationRecords ?? 0} reconciliation / ${
      report?.counts.workerHeartbeats ?? 0
    } worker heartbeats`,
    source: 'Reports API integrations DTO',
    route: '/integrations',
    exportStatus: exportStatusFor(data, 'integrations'),
  }
}

function statusFor(
  data: ReportsViewData,
  category: ReportCategory,
  report:
    | ProcurementReportDto
    | FinanceReportDto
    | AuditReportDto
    | IntegrationReportDto
    | undefined,
): ReportStatus {
  const section = data.summary.sections.find((item) => item.id === category)

  if (section?.status === 'restricted') {
    return 'restricted'
  }

  if (!report && section?.status === 'ready') {
    return 'partial'
  }

  if ((section?.total ?? 0) > 0) {
    return 'api_backed'
  }

  return 'empty'
}

function exportStatusFor(data: ReportsViewData, category: ReportCategory) {
  const section = data.summary.sections.find((item) => item.id === category)

  return section?.status === 'restricted' ? 'restricted' : 'available'
}
