export const apiBaseUrl =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1'

export function withQuery(
  path: string,
  params: Record<string, string | number | null | undefined>,
) {
  const query = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      query.set(key, String(value))
    }
  })

  const queryString = query.toString()

  return queryString ? `${path}?${queryString}` : path
}

export function scopedPath(path: string, organizationId?: string | null) {
  return withQuery(path, { organizationId })
}

export const endpoints = {
  health: '/health',
  auth: {
    devLogin: '/auth/dev-login',
    session: '/auth/session',
  },
  organizations: {
    create: '/orgs',
    detail: (id: string) => `/orgs/${id}`,
    memberships: (organizationId?: string | null) =>
      scopedPath(`/orgs/${organizationId ?? ''}/memberships`, organizationId),
  },
  users: {
    list: '/users',
    create: '/users',
  },
  roles: {
    list: '/roles',
    create: '/roles',
  },
  memberships: {
    create: '/memberships',
  },
  auditEvents: {
    list: (organizationId?: string | null) =>
      scopedPath('/audit-events', organizationId),
    search: (params: {
      organizationId?: string | null
      eventType?: string
      actorUserId?: string
      entityType?: string
      entityId?: string
      from?: string
      to?: string
      page?: number
      pageSize?: number
    }) => withQuery('/audit-events/search', params),
    entityTimeline: (
      entityType: string,
      entityId: string,
      organizationId?: string | null,
    ) =>
      scopedPath(
        `/audit-events/entity/${encodeURIComponent(entityType)}/${encodeURIComponent(
          entityId,
        )}`,
        organizationId,
      ),
  },
  projects: {
    list: (organizationId?: string | null) =>
      scopedPath('/projects', organizationId),
    create: '/projects',
  },
  suppliers: {
    list: (organizationId?: string | null) =>
      scopedPath('/suppliers', organizationId),
    detail: (id: string) => `/suppliers/${id}`,
    create: '/suppliers',
  },
  requisitions: {
    list: (organizationId?: string | null) =>
      scopedPath('/requisitions', organizationId),
    detail: (id: string) => `/requisitions/${id}`,
    create: '/requisitions',
    transition: (id: string, action: 'submit' | 'approve' | 'reject') =>
      `/requisitions/${id}/${action}`,
  },
  rfqs: {
    list: (organizationId?: string | null) => scopedPath('/rfqs', organizationId),
    detail: (id: string) => `/rfqs/${id}`,
    create: '/rfqs',
    publish: (id: string) => `/rfqs/${id}/publish`,
  },
  quotations: {
    list: (organizationId?: string | null) =>
      scopedPath('/quotations', organizationId),
    create: '/quotations',
  },
  purchaseOrders: {
    list: (organizationId?: string | null) =>
      scopedPath('/purchase-orders', organizationId),
    detail: (id: string) => `/purchase-orders/${id}`,
    create: '/purchase-orders',
    issue: (id: string) => `/purchase-orders/${id}/issue`,
  },
  receipts: {
    create: '/receipts',
  },
  invoices: {
    create: '/invoices',
  },
  procurementOperations: {
    approvals: (
      organizationId?: string | null,
      actorUserId?: string | null,
    ) => withQuery('/procurement/approvals', { organizationId, actorUserId }),
    approvalRules: (organizationId?: string | null) =>
      scopedPath('/procurement/approval-rules', organizationId),
    approvalRule: (id: string) => `/procurement/approval-rules/${id}`,
    matching: (organizationId?: string | null) =>
      scopedPath('/procurement/matching', organizationId),
  },
  documents: {
    list: (organizationId?: string | null) =>
      scopedPath('/documents', organizationId),
    detail: (id: string) => `/documents/${id}`,
    create: '/documents',
    upload: '/documents/upload',
    uploadVersion: (id: string) => `/documents/${id}/versions/upload`,
    previewVersion: (id: string, versionId: string) =>
      `/documents/${id}/versions/${versionId}/preview`,
    downloadVersion: (id: string, versionId: string) =>
      `/documents/${id}/versions/${versionId}/download`,
  },
  evidenceItems: {
    list: (organizationId?: string | null) =>
      scopedPath('/evidence-items', organizationId),
    create: '/evidence-items',
  },
  evidencePacks: {
    list: (organizationId?: string | null) =>
      scopedPath('/evidence-packs', organizationId),
    detail: (id: string) => `/evidence-packs/${id}`,
    create: '/evidence-packs',
    export: (id: string) => `/evidence-packs/${id}/export`,
    downloadExport: (
      id: string,
      format: 'json' | 'pdf',
      actorUserId?: string | null,
    ) => withQuery(`/evidence-packs/${id}/export/download`, { format, actorUserId }),
  },
  hashRecords: {
    create: '/hash-records',
    detail: (id: string) => `/hash-records/${id}`,
    verify: (id: string) => `/hash-records/${id}/verify`,
  },
  opportunities: {
    list: (organizationId?: string | null) =>
      scopedPath('/opportunities', organizationId),
    create: '/opportunities',
  },
  applications: {
    list: (organizationId?: string | null) =>
      scopedPath('/applications', organizationId),
    detail: (id: string) => `/applications/${id}`,
    create: '/applications',
    submit: (id: string) => `/applications/${id}/submit`,
    evidenceChecklist: (id: string) => `/applications/${id}/evidence-checklist`,
    dueDiligence: (id: string) => `/applications/${id}/due-diligence`,
    shariahReview: (id: string) => `/applications/${id}/shariah-review`,
    approve: (id: string) => `/applications/${id}/approve`,
    reject: (id: string) => `/applications/${id}/reject`,
  },
  evidenceChecklists: {
    completeItem: (id: string) => `/evidence-checklists/${id}/complete-item`,
  },
  contracts: {
    list: (organizationId?: string | null) =>
      scopedPath('/contracts', organizationId),
    create: '/contracts',
    markSigned: (id: string) => `/contracts/${id}/mark-signed`,
    generateDocument: (id: string) => `/contracts/${id}/generate-document`,
  },
  disbursements: {
    create: '/disbursements',
  },
  ledgers: {
    entries: (organizationId?: string | null) =>
      scopedPath('/project-ledgers/entries', organizationId),
    createEntry: '/project-ledgers/entries',
  },
  profitLoss: {
    statements: (organizationId?: string | null) =>
      scopedPath('/profit-loss/statements', organizationId),
    createStatement: '/profit-loss/statements',
  },
  closures: {
    list: (organizationId?: string | null) =>
      scopedPath('/closures', organizationId),
    create: '/closures',
  },
  graph: {
    project: (
      projectId: string,
      organizationId?: string | null,
      actorUserId?: string | null,
    ) =>
      withQuery(`/graph/projects/${projectId}`, {
        organizationId,
        actorUserId,
      }),
  },
  integrations: {
    outbox: (organizationId?: string | null) =>
      scopedPath('/integrations/outbox', organizationId),
    outboxEvent: (id: string) => `/integrations/outbox/${id}`,
    reconciliation: (organizationId?: string | null) =>
      scopedPath('/integrations/reconciliation', organizationId),
    workers: '/integrations/workers',
    fabricStatus: '/integrations/fabric/status',
    fabricAnchor: '/integrations/fabric/anchors',
    esignPackage: '/integrations/esign/packages',
    erpSync: '/integrations/erp/sync',
    financeApiNotification: '/integrations/finance-api/notifications',
    webhookSubscriptions: (organizationId?: string | null) =>
      scopedPath('/integrations/webhooks/subscriptions', organizationId),
    createWebhookSubscription: '/integrations/webhooks/subscriptions',
    webhookDelivery: '/integrations/webhooks/deliveries',
  },
} as const
