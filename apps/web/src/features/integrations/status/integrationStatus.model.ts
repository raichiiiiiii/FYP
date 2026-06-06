import type { HealthResponse } from '../../../shared/types'

export type IntegrationHealthStatus =
  | 'healthy'
  | 'degraded'
  | 'unavailable'
  | 'not_configured'
  | 'pending'

export type IntegrationType =
  | 'erp'
  | 'fabric'
  | 'webhook'
  | 'esignature'
  | 'payment'
  | 'email'
  | 'outbox'
  | 'worker'

export type IntegrationStatusCard = {
  id: string
  name: string
  type: IntegrationType
  status: IntegrationHealthStatus
  lastCheckedAt?: string
  message: string
  evidence: 'health_check' | 'outbox' | 'reconciliation' | 'configuration'
  mode:
    | 'internal_queue'
    | 'mock_adapter'
    | 'configuration_only'
    | 'historical_reconciliation'
    | 'real_gateway_required'
}

export type FabricRuntimeStatusSummary = {
  enabled: boolean
  mode: 'mock' | 'gateway'
  gatewayConfigured: boolean
  gatewayMaterialReady: boolean
  realGatewayAdapterImplemented: boolean
  missingGatewayConfig: string[]
  secretMaterial: {
    required: boolean
    allPresent: boolean
    files: {
      identityCert: 'present' | 'missing' | 'not_required'
      privateKey: 'present' | 'missing' | 'not_required'
      tlsCert: 'present' | 'missing' | 'not_required'
    }
    missing: string[]
  }
  latestRealAnchor: {
    present: boolean
    status: string
    hasTransactionId: boolean
    hasBlockNumber: boolean
    channelRecorded: boolean
    chaincodeRecorded: boolean
    commitStatus?: string | null
    endorsementStatus?: string | null
    anchoredAt?: string | null
    verifiedAt?: string | null
  }
  configuredChannel: 'configured' | 'not_configured'
  configuredChaincode: 'configured' | 'not_configured'
  configuredMspId: 'configured' | 'not_configured'
  submitTimeoutMs: number
  commitTimeoutMs: number
  securityBoundary: string
  message: string
}

export type IntegrationQueueEvent = {
  eventType: string
  displayStatus?: string
  status?: string
  attempts?: number
  lastError?: string | null
  nextRunAt?: string | null
  createdAt?: string | null
  updatedAt?: string | null
}

export type ReconciliationSummary = {
  integrationType: string
  status: string
  externalReference?: string | null
  lastError?: string | null
  updatedAt?: string | null
  createdAt?: string | null
}

export type WebhookSubscriptionSummary = {
  status: string
  updatedAt?: string | null
  createdAt?: string | null
}

export type OperationalHealthItem = {
  id: string
  name: string
  category:
    | 'api'
    | 'database'
    | 'redis'
    | 'object_storage'
    | 'worker'
    | 'backup'
    | 'deployment'
  status: IntegrationHealthStatus
  message: string
  lastCheckedAt?: string
}

export type WorkerHeartbeatSummary = {
  workerName: string
  queueName: string
  status: string
  healthStatus: IntegrationHealthStatus
  lastSeenAt?: string | null
  processedCount: number
  failedCount: number
  message: string
}

export type OperationsReadinessSummary = {
  healthy: number
  degraded: number
  unavailable: number
  notConfigured: number
  pending: number
  productionReady: boolean
}

const failedStatuses = new Set(['FAILED', 'DEAD_LETTERED'])
const pendingStatuses = new Set(['PENDING', 'PROCESSING'])
const retryingStatuses = new Set(['RETRYING'])
const successStatuses = new Set([
  'COMPLETED',
  'RECONCILED',
  'ACKNOWLEDGED',
  'SENT',
  'ACTIVE',
])

export function buildIntegrationStatusCards({
  outbox,
  reconciliation,
  subscriptions,
}: {
  outbox: IntegrationQueueEvent[]
  reconciliation: ReconciliationSummary[]
  subscriptions: WebhookSubscriptionSummary[]
}): IntegrationStatusCard[] {
  return [
    buildOutboxStatus(outbox),
    buildAdapterStatus({
      id: 'erp',
      name: 'ERP adapter',
      type: 'erp',
      outbox,
      reconciliation,
      match: (value) => value.includes('ERP'),
      fallbackMessage:
        'No ERP health probe or reconciliation data is available yet.',
    }),
    buildAdapterStatus({
      id: 'fabric',
      name: 'Fabric anchor adapter',
      type: 'fabric',
      outbox,
      reconciliation,
      match: (value) => value.includes('FABRIC') || value.includes('ANCHOR'),
      fallbackMessage:
        'No Fabric anchor outbox or reconciliation evidence is available yet. Check Fabric runtime mode below for Gateway configuration and secret material readiness.',
    }),
    buildAdapterStatus({
      id: 'webhook',
      name: 'Webhook delivery',
      type: 'webhook',
      outbox,
      reconciliation,
      match: (value) => value.includes('WEBHOOK'),
      fallbackMessage: subscriptions.length
        ? 'Webhook subscriptions exist, but delivery health has not been probed.'
        : 'No webhook subscriptions or delivery health checks are configured.',
      configuredStatus: subscriptions.length ? 'pending' : 'not_configured',
      configuredAt: latestDate(subscriptions),
    }),
    buildAdapterStatus({
      id: 'esignature',
      name: 'E-signature adapter',
      type: 'esignature',
      outbox,
      reconciliation,
      match: (value) => value.includes('ESIGN'),
      fallbackMessage:
        'E-signature provider health is not configured in this prototype.',
    }),
    buildAdapterStatus({
      id: 'payment',
      name: 'Finance API adapter',
      type: 'payment',
      outbox,
      reconciliation,
      match: (value) => value.includes('FINANCE_API'),
      fallbackMessage:
        'Finance API health is not configured; requests must go through outbox.',
    }),
  ]
}

export function buildFabricRuntimeStatusCard(
  fabricStatus: FabricRuntimeStatusSummary | null,
): IntegrationStatusCard {
  if (!fabricStatus) {
    return {
      id: 'fabric-runtime',
      name: 'Fabric Gateway mode',
      type: 'fabric',
      status: 'unavailable',
      message:
        'Fabric runtime status could not be loaded from the API. Treat Gateway readiness as unverified.',
      evidence: 'configuration',
      mode: 'configuration_only',
    }
  }

  if (fabricStatus.mode === 'mock') {
    return {
      id: 'fabric-runtime',
      name: 'Fabric Gateway mode',
      type: 'fabric',
      status: fabricStatus.enabled ? 'pending' : 'not_configured',
      message: fabricStatus.message,
      evidence: 'configuration',
      mode: 'mock_adapter',
    }
  }

  if (!fabricStatus.gatewayConfigured || fabricStatus.missingGatewayConfig.length) {
    return {
      id: 'fabric-runtime',
      name: 'Fabric Gateway mode',
      type: 'fabric',
      status: 'degraded',
      message: `Gateway mode is selected, but ${fabricStatus.missingGatewayConfig.length} required configuration value(s) are missing.`,
      evidence: 'configuration',
      mode: 'real_gateway_required',
    }
  }

  if (!fabricStatus.gatewayMaterialReady) {
    return {
      id: 'fabric-runtime',
      name: 'Fabric Gateway mode',
      type: 'fabric',
      status: 'degraded',
      message:
        fabricStatus.secretMaterial.missing.length > 0
          ? `Gateway environment is present, but mounted Fabric material is missing: ${fabricStatus.secretMaterial.missing.join(', ')}.`
          : fabricStatus.message,
      evidence: 'configuration',
      mode: 'real_gateway_required',
    }
  }

  if (!fabricStatus.latestRealAnchor.present) {
    return {
      id: 'fabric-runtime',
      name: 'Fabric Gateway mode',
      type: 'fabric',
      status: 'pending',
      message:
        'Gateway material is present. Waiting for the worker to record a real Fabric anchor transaction.',
      evidence: 'configuration',
      mode: 'real_gateway_required',
    }
  }

  return {
    id: 'fabric-runtime',
    name: 'Fabric Gateway mode',
    type: 'fabric',
    status: fabricStatus.realGatewayAdapterImplemented ? 'healthy' : 'degraded',
    message: fabricStatus.realGatewayAdapterImplemented
      ? 'Gateway material is present and real Fabric anchor evidence exists. Use hash-record verification for full on-chain proof.'
      : fabricStatus.message,
    evidence: 'configuration',
    mode: 'real_gateway_required',
  }
}

export function buildOperationalHealthItems({
  health,
  healthError,
  outbox,
  workerHeartbeats = [],
}: {
  health: HealthResponse | null
  healthError?: string
  outbox: IntegrationQueueEvent[]
  workerHeartbeats?: WorkerHeartbeatSummary[]
}): OperationalHealthItem[] {
  const outboxStatus = buildOutboxStatus(outbox)
  const workerStatus = buildWorkerHealthStatus(workerHeartbeats, outboxStatus)

  return [
    {
      id: 'api',
      name: 'MEPN API',
      category: 'api',
      status: health
        ? health.status === 'ok'
          ? 'healthy'
          : 'degraded'
        : 'unavailable',
      message: health
        ? `${health.service} responded in ${health.environment} mode.`
        : healthError ?? 'API health endpoint is unavailable.',
      lastCheckedAt: health?.timestamp,
    },
    {
      id: 'postgres',
      name: 'PostgreSQL',
      category: 'database',
      status: statusFromDependency(health?.database),
      message: health
        ? dependencyMessage('PostgreSQL', health.database)
        : 'Database health cannot be confirmed without API health data.',
      lastCheckedAt: health?.timestamp,
    },
    {
      id: 'redis',
      name: 'Redis queue/cache',
      category: 'redis',
      status: statusFromDependency(health?.redis),
      message: health
        ? dependencyMessage('Redis', health.redis)
        : 'Redis health cannot be confirmed without API health data.',
      lastCheckedAt: health?.timestamp,
    },
    {
      id: 'outbox-worker',
      name: 'Outbox worker visibility',
      category: 'worker',
      status: workerStatus.status,
      message: workerStatus.message,
      lastCheckedAt: workerStatus.lastCheckedAt,
    },
    {
      id: 'object-storage',
      name: 'Object storage',
      category: 'object_storage',
      status: 'not_configured',
      message:
        'No MinIO/S3 health endpoint is connected to the operations UI yet.',
      lastCheckedAt: health?.timestamp,
    },
    {
      id: 'backup-restore',
      name: 'Backup and restore',
      category: 'backup',
      status: 'not_configured',
      message:
        'No backup freshness or restore-test endpoint exists yet; production readiness is blocked.',
      lastCheckedAt: health?.timestamp,
    },
    {
      id: 'deployment-readiness',
      name: 'Deployment readiness',
      category: 'deployment',
      status: health?.status === 'ok' ? 'pending' : 'degraded',
      message:
        'Prototype readiness is visible, but TLS, backups, object storage, and release metadata are not fully verified.',
      lastCheckedAt: health?.timestamp,
    },
  ]
}

export function summarizeOperationalHealth(
  items: OperationalHealthItem[],
): OperationsReadinessSummary {
  const summary = items.reduce(
    (counts, item) => ({
      ...counts,
      [item.status]: counts[item.status] + 1,
    }),
    {
      healthy: 0,
      degraded: 0,
      unavailable: 0,
      not_configured: 0,
      pending: 0,
    } as Record<IntegrationHealthStatus, number>,
  )

  return {
    healthy: summary.healthy,
    degraded: summary.degraded,
    unavailable: summary.unavailable,
    notConfigured: summary.not_configured,
    pending: summary.pending,
    productionReady:
      summary.degraded === 0 &&
      summary.unavailable === 0 &&
      summary.not_configured === 0 &&
      summary.pending === 0,
  }
}

export function integrationHealthLabel(status: IntegrationHealthStatus) {
  const labels: Record<IntegrationHealthStatus, string> = {
    healthy: 'Healthy',
    degraded: 'Degraded',
    unavailable: 'Unavailable',
    not_configured: 'Not configured',
    pending: 'Pending',
  }

  return labels[status]
}

export function integrationModeLabel(mode: IntegrationStatusCard['mode']) {
  const labels: Record<IntegrationStatusCard['mode'], string> = {
    internal_queue: 'Internal queue',
    mock_adapter: 'Mock adapter',
    configuration_only: 'Configuration only',
    historical_reconciliation: 'Historical reconciliation',
    real_gateway_required: 'Real Gateway required',
  }

  return labels[mode]
}

function buildOutboxStatus(
  outbox: IntegrationQueueEvent[],
): IntegrationStatusCard {
  const failed = outbox.filter((event) =>
    failedStatuses.has(normalizeStatus(event.displayStatus ?? event.status)),
  )
  const retrying = outbox.filter((event) =>
    retryingStatuses.has(normalizeStatus(event.displayStatus ?? event.status)),
  )
  const pending = outbox.filter((event) =>
    pendingStatuses.has(normalizeStatus(event.displayStatus ?? event.status)),
  )

  if (failed.length) {
    return {
      id: 'outbox',
      name: 'Outbox queue',
      type: 'outbox',
      status: 'degraded',
      message: `${failed.length} integration event(s) failed and require attention.`,
      evidence: 'outbox',
      mode: 'internal_queue',
      lastCheckedAt: latestDate(failed),
    }
  }

  if (retrying.length) {
    return {
      id: 'outbox',
      name: 'Outbox queue',
      type: 'outbox',
      status: 'degraded',
      message: `${retrying.length} event(s) are retrying with idempotent side effects.`,
      evidence: 'outbox',
      mode: 'internal_queue',
      lastCheckedAt: latestDate(retrying),
    }
  }

  if (pending.length) {
    return {
      id: 'outbox',
      name: 'Outbox queue',
      type: 'outbox',
      status: 'pending',
      message: `${pending.length} event(s) are waiting for worker processing.`,
      evidence: 'outbox',
      mode: 'internal_queue',
      lastCheckedAt: latestDate(pending),
    }
  }

  return {
    id: 'outbox',
    name: 'Outbox queue',
    type: 'outbox',
    status: 'healthy',
    message: 'Outbox API loaded and no pending, retrying, or failed events exist.',
    evidence: 'outbox',
    mode: 'internal_queue',
    lastCheckedAt: latestDate(outbox),
  }
}

function buildWorkerHealthStatus(
  workerHeartbeats: WorkerHeartbeatSummary[],
  outboxStatus: IntegrationStatusCard,
): Pick<OperationalHealthItem, 'status' | 'message' | 'lastCheckedAt'> {
  const outboxWorker =
    workerHeartbeats.find((worker) => worker.queueName === 'outbox') ??
    workerHeartbeats[0]

  if (!outboxWorker) {
    return {
      status: 'not_configured',
      message:
        'No worker heartbeat is available. Worker status cannot be inferred from API health alone.',
    }
  }

  if (outboxStatus.status === 'degraded') {
    return {
      status: 'degraded',
      message: `${outboxWorker.message} Queue status is degraded: ${outboxStatus.message}`,
      lastCheckedAt: outboxWorker.lastSeenAt ?? undefined,
    }
  }

  return {
    status: outboxWorker.healthStatus,
    message: `${outboxWorker.message} Processed ${outboxWorker.processedCount}; failed ${outboxWorker.failedCount}.`,
    lastCheckedAt: outboxWorker.lastSeenAt ?? undefined,
  }
}

function buildAdapterStatus({
  id,
  name,
  type,
  outbox,
  reconciliation,
  match,
  fallbackMessage,
  configuredStatus = 'not_configured',
  configuredAt,
}: {
  id: string
  name: string
  type: IntegrationType
  outbox: IntegrationQueueEvent[]
  reconciliation: ReconciliationSummary[]
  match: (value: string) => boolean
  fallbackMessage: string
  configuredStatus?: IntegrationHealthStatus
  configuredAt?: string
}): IntegrationStatusCard {
  const relatedOutbox = outbox.filter((event) =>
    match(`${event.eventType} ${event.status ?? ''} ${event.displayStatus ?? ''}`.toUpperCase()),
  )
  const relatedReconciliation = reconciliation.filter((record) =>
    match(`${record.integrationType} ${record.status}`.toUpperCase()),
  )
  const failedOutbox = relatedOutbox.filter((event) =>
    failedStatuses.has(normalizeStatus(event.displayStatus ?? event.status)),
  )
  const retryingOutbox = relatedOutbox.filter((event) =>
    retryingStatuses.has(normalizeStatus(event.displayStatus ?? event.status)),
  )
  const pendingOutbox = relatedOutbox.filter((event) =>
    pendingStatuses.has(normalizeStatus(event.displayStatus ?? event.status)),
  )
  const failedReconciliation = relatedReconciliation.filter((record) =>
    failedStatuses.has(normalizeStatus(record.status)),
  )
  const successfulReconciliation = relatedReconciliation.filter((record) =>
    successStatuses.has(normalizeStatus(record.status)),
  )

  if (failedOutbox.length || failedReconciliation.length) {
    return {
      id,
      name,
      type,
      status: 'degraded',
      message:
        failedOutbox[0]?.lastError ??
        failedReconciliation[0]?.lastError ??
        'A related integration event failed.',
      evidence: failedOutbox.length ? 'outbox' : 'reconciliation',
      mode: 'mock_adapter',
      lastCheckedAt: latestDate([...failedOutbox, ...failedReconciliation]),
    }
  }

  if (retryingOutbox.length) {
    return {
      id,
      name,
      type,
      status: 'degraded',
      message: `${retryingOutbox.length} related event(s) are retrying.`,
      evidence: 'outbox',
      mode: 'mock_adapter',
      lastCheckedAt: latestDate(retryingOutbox),
    }
  }

  if (pendingOutbox.length) {
    return {
      id,
      name,
      type,
      status: 'pending',
      message: `${pendingOutbox.length} related event(s) are queued or processing.`,
      evidence: 'outbox',
      mode: 'mock_adapter',
      lastCheckedAt: latestDate(pendingOutbox),
    }
  }

  if (successfulReconciliation.length) {
    return {
      id,
      name,
      type,
      status: 'healthy',
      message:
        'Latest reconciliation succeeded. This is historical evidence, not a live adapter probe.',
      evidence: 'reconciliation',
      mode: 'historical_reconciliation',
      lastCheckedAt: latestDate(successfulReconciliation),
    }
  }

  return {
    id,
    name,
    type,
    status: configuredStatus,
    message: fallbackMessage,
    evidence: 'configuration',
    mode: 'configuration_only',
    lastCheckedAt: configuredAt,
  }
}

function statusFromDependency(status?: 'ok' | 'error'): IntegrationHealthStatus {
  if (status === 'ok') {
    return 'healthy'
  }

  if (status === 'error') {
    return 'unavailable'
  }

  return 'unavailable'
}

function dependencyMessage(name: string, status: 'ok' | 'error') {
  return status === 'ok'
    ? `${name} connectivity was confirmed by the API health endpoint.`
    : `${name} connectivity failed in the API health endpoint.`
}

function normalizeStatus(status?: string | null) {
  return (status ?? '').toUpperCase()
}

function latestDate(
  items: Array<{
    updatedAt?: string | null
    createdAt?: string | null
    lastCheckedAt?: string | null
  }>,
) {
  return items
    .map((item) => item.updatedAt ?? item.createdAt ?? item.lastCheckedAt)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1)
}
