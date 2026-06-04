import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 15_000,
    },
  },
})

const scopedKey = (domain: string, resource: string, organizationId?: string | null) =>
  [domain, resource, organizationId ?? 'global'] as const

export const queryKeys = {
  dashboard: {
    health: ['dashboard', 'health'] as const,
    organization: (organizationId?: string | null) =>
      scopedKey('dashboard', 'organization', organizationId),
  },
  procurement: {
    projects: (organizationId?: string | null) =>
      scopedKey('procurement', 'projects', organizationId),
    suppliers: (organizationId?: string | null) =>
      scopedKey('procurement', 'suppliers', organizationId),
    supplier: (supplierId?: string | null) =>
      ['procurement', 'supplier', supplierId ?? 'none'] as const,
    requisitions: (organizationId?: string | null) =>
      scopedKey('procurement', 'requisitions', organizationId),
    requisition: (requisitionId?: string | null) =>
      ['procurement', 'requisition', requisitionId ?? 'none'] as const,
    approvals: (organizationId?: string | null, actorUserId?: string | null) =>
      [
        'procurement',
        'approvals',
        organizationId ?? 'global',
        actorUserId ?? 'all',
      ] as const,
    approvalRules: (organizationId?: string | null) =>
      scopedKey('procurement', 'approval-rules', organizationId),
    rfqs: (organizationId?: string | null) =>
      scopedKey('procurement', 'rfqs', organizationId),
    rfq: (rfqId?: string | null) =>
      ['procurement', 'rfq', rfqId ?? 'none'] as const,
    quotations: (organizationId?: string | null) =>
      scopedKey('procurement', 'quotations', organizationId),
    purchaseOrders: (organizationId?: string | null) =>
      scopedKey('procurement', 'purchase-orders', organizationId),
    purchaseOrder: (purchaseOrderId?: string | null) =>
      ['procurement', 'purchase-order', purchaseOrderId ?? 'none'] as const,
    matching: (organizationId?: string | null) =>
      scopedKey('procurement', 'matching', organizationId),
  },
  evidence: {
    documents: (organizationId?: string | null) =>
      scopedKey('evidence', 'documents', organizationId),
    document: (documentId?: string | null) =>
      ['evidence', 'document', documentId ?? 'none'] as const,
    evidenceItems: (organizationId?: string | null) =>
      scopedKey('evidence', 'items', organizationId),
    evidencePacks: (organizationId?: string | null) =>
      scopedKey('evidence', 'packs', organizationId),
    evidencePack: (packId?: string | null) =>
      ['evidence', 'pack', packId ?? 'none'] as const,
    hashRecords: (organizationId?: string | null) =>
      scopedKey('evidence', 'hash-records', organizationId),
    hashRecord: (hashRecordId?: string | null) =>
      ['evidence', 'hash-record', hashRecordId ?? 'none'] as const,
    auditTimeline: (
      organizationId?: string | null,
      entityType?: string,
      entityId?: string,
    ) =>
      [
        'evidence',
        'audit-timeline',
        organizationId ?? 'global',
        entityType ?? 'entity',
        entityId ?? 'id',
      ] as const,
  },
  audit: {
    events: (organizationId?: string | null) =>
      scopedKey('audit', 'events', organizationId),
    search: (
      organizationId?: string | null,
      filters?: Record<string, string | number | undefined>,
    ) =>
      [
        'audit',
        'search',
        organizationId ?? 'global',
        filters?.eventType ?? '',
        filters?.actorUserId ?? '',
        filters?.entityType ?? '',
        filters?.entityId ?? '',
        filters?.from ?? '',
        filters?.to ?? '',
        filters?.page ?? 1,
        filters?.pageSize ?? 25,
      ] as const,
  },
  finance: {
    opportunities: (organizationId?: string | null) =>
      scopedKey('finance', 'opportunities', organizationId),
    applications: (organizationId?: string | null) =>
      scopedKey('finance', 'applications', organizationId),
    application: (applicationId?: string | null) =>
      ['finance', 'application', applicationId ?? 'none'] as const,
    contracts: (organizationId?: string | null) =>
      scopedKey('finance', 'contracts', organizationId),
    ledgers: (organizationId?: string | null) =>
      scopedKey('finance', 'ledgers', organizationId),
    profitLoss: (organizationId?: string | null) =>
      scopedKey('finance', 'profit-loss', organizationId),
    closures: (organizationId?: string | null) =>
      scopedKey('finance', 'closures', organizationId),
  },
  graph: {
    project: (
      organizationId?: string | null,
      actorUserId?: string | null,
      projectId?: string | null,
    ) =>
      [
        'graph',
        'project',
        organizationId ?? 'global',
        actorUserId ?? 'anonymous',
        projectId ?? 'none',
      ] as const,
  },
  integrations: {
    fabricStatus: ['integrations', 'fabric-status'] as const,
    outbox: (organizationId?: string | null) =>
      scopedKey('integrations', 'outbox', organizationId),
    reconciliation: (organizationId?: string | null) =>
      scopedKey('integrations', 'reconciliation', organizationId),
    webhookSubscriptions: (organizationId?: string | null) =>
      scopedKey('integrations', 'webhook-subscriptions', organizationId),
  },
}
