import { useCallback, useMemo } from 'react'

import { endpoints } from '../../../shared/api/endpoints'
import { queryKeys } from '../../../shared/api/query-client'
import { useApiData } from '../../../shared/api/useApiData'
import type { AppSession } from '../../../shared/types'

export type IntegrationStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'RETRYING'

export type OutboxEventView = {
  id: string
  organizationId?: string | null
  eventType: string
  aggregateType: string
  aggregateId: string
  payload: Record<string, unknown>
  status: string
  displayStatus: IntegrationStatus | string
  attempts: number
  nextRunAt: string
  lastError?: string | null
  idempotencyKey?: string | null
  processedAt?: string | null
  createdAt: string
  updatedAt?: string | null
  reconciliationRecord?: ReconciliationRecord | null
}

export type ReconciliationRecord = {
  id: string
  organizationId?: string | null
  outboxEventId?: string | null
  integrationType: string
  aggregateType: string
  aggregateId: string
  externalReference?: string | null
  status: string
  requestPayload: Record<string, unknown>
  responsePayload?: Record<string, unknown> | null
  lastError?: string | null
  attempts: number
  createdAt: string
  updatedAt: string
}

export type WebhookSubscription = {
  id: string
  organizationId?: string | null
  eventType: string
  targetUrl: string
  status: string
  createdAt: string
  updatedAt: string
}

export type FabricRuntimeStatus = {
  enabled: boolean
  mode: 'mock' | 'gateway'
  gatewayConfigured: boolean
  realGatewayAdapterImplemented: boolean
  anchorResultSource: string
  missingGatewayConfig: string[]
  configuredChannel: 'configured' | 'not_configured'
  configuredChaincode: 'configured' | 'not_configured'
  configuredMspId: 'configured' | 'not_configured'
  submitTimeoutMs: number
  commitTimeoutMs: number
  securityBoundary: string
  message: string
}

export type WorkerHeartbeatView = {
  id: string
  workerName: string
  queueName: string
  status: string
  healthStatus: 'healthy' | 'degraded' | 'unavailable' | 'not_configured' | 'pending'
  lastSeenAt: string
  processedCount: number
  failedCount: number
  metadata?: Record<string, unknown> | null
  message: string
  createdAt: string
  updatedAt: string
}

export type OperationsTimelineCategory =
  | 'health'
  | 'worker'
  | 'outbox'
  | 'reconciliation'
  | 'fabric'
  | 'report'
  | 'backup'
  | 'deployment'

export type OperationsTimelineSeverity = 'info' | 'success' | 'warning' | 'error'

export type OperationsTimelineItem = {
  id: string
  timestamp: string
  category: OperationsTimelineCategory
  severity: OperationsTimelineSeverity
  title: string
  summary: string
  entityType?: string
  entityId?: string
  sourcePath?: string
  evidencePath?: string
  status?: string
  metadataSummary?: Record<string, string | number | boolean | null>
}

export type OperationsTimelineFilters = {
  category?: OperationsTimelineCategory | 'all'
  severity?: OperationsTimelineSeverity | 'all'
  limit?: number
}

type RequestBody = Record<string, unknown>

export function useIntegrations(session: AppSession) {
  const { fetchQuery, mutate } = useApiData()

  const organizationId = session.organizationId
  const actorUserId = session.actorUserId
  const invalidate = useMemo(
    () => [
      queryKeys.integrations.outbox(organizationId),
      queryKeys.integrations.reconciliation(organizationId),
      queryKeys.integrations.webhookSubscriptions(organizationId),
    ],
    [organizationId],
  )

  const listOutbox = useCallback(
    <T = OutboxEventView[]>() => {
      requireSession(organizationId)

      return fetchQuery<T>(
        queryKeys.integrations.outbox(organizationId),
        endpoints.integrations.outbox(organizationId),
      )
    },
    [fetchQuery, organizationId],
  )

  const listReconciliation = useCallback(
    <T = ReconciliationRecord[]>() => {
      requireSession(organizationId)

      return fetchQuery<T>(
        queryKeys.integrations.reconciliation(organizationId),
        endpoints.integrations.reconciliation(organizationId),
      )
    },
    [fetchQuery, organizationId],
  )

  const listWebhookSubscriptions = useCallback(
    <T = WebhookSubscription[]>() => {
      requireSession(organizationId)

      return fetchQuery<T>(
        queryKeys.integrations.webhookSubscriptions(organizationId),
        endpoints.integrations.webhookSubscriptions(organizationId),
      )
    },
    [fetchQuery, organizationId],
  )

  const getFabricStatus = useCallback(
    <T = FabricRuntimeStatus>() =>
      fetchQuery<T>(
        queryKeys.integrations.fabricStatus,
        endpoints.integrations.fabricStatus,
      ),
    [fetchQuery],
  )

  const listWorkerHeartbeats = useCallback(
    <T = WorkerHeartbeatView[]>() =>
      fetchQuery<T>(
        queryKeys.integrations.workers,
        endpoints.integrations.workers,
      ),
    [fetchQuery],
  )

  const listTimeline = useCallback(
    <T = OperationsTimelineItem[]>(filters: OperationsTimelineFilters = {}) => {
      requireSession(organizationId)
      requireActor(actorUserId)

      const normalizedFilters = {
        category: filters.category === 'all' ? undefined : filters.category,
        severity: filters.severity === 'all' ? undefined : filters.severity,
        limit: filters.limit ?? 50,
      }

      return fetchQuery<T>(
        queryKeys.integrations.timeline(
          organizationId,
          actorUserId,
          normalizedFilters,
        ),
        endpoints.integrations.timeline(
          organizationId,
          actorUserId,
          normalizedFilters,
        ),
      )
    },
    [actorUserId, fetchQuery, organizationId],
  )

  const queueFabricAnchor = useCallback(
    (body: RequestBody) =>
      mutate<OutboxEventView>({
        path: endpoints.integrations.fabricAnchor,
        method: 'POST',
        body: scopedBody(body, organizationId, actorUserId),
        invalidate,
      }),
    [actorUserId, invalidate, mutate, organizationId],
  )

  const queueEsignPackage = useCallback(
    (body: RequestBody) =>
      mutate<OutboxEventView>({
        path: endpoints.integrations.esignPackage,
        method: 'POST',
        body: scopedBody(body, organizationId, actorUserId),
        invalidate,
      }),
    [actorUserId, invalidate, mutate, organizationId],
  )

  const queueErpSync = useCallback(
    (body: RequestBody) =>
      mutate<OutboxEventView>({
        path: endpoints.integrations.erpSync,
        method: 'POST',
        body: scopedBody(body, organizationId, actorUserId),
        invalidate,
      }),
    [actorUserId, invalidate, mutate, organizationId],
  )

  const queueFinanceApiNotification = useCallback(
    (body: RequestBody) =>
      mutate<OutboxEventView>({
        path: endpoints.integrations.financeApiNotification,
        method: 'POST',
        body: scopedBody(body, organizationId, actorUserId),
        invalidate,
      }),
    [actorUserId, invalidate, mutate, organizationId],
  )

  const queueWebhookDelivery = useCallback(
    (body: RequestBody) =>
      mutate<OutboxEventView>({
        path: endpoints.integrations.webhookDelivery,
        method: 'POST',
        body: scopedBody(body, organizationId, actorUserId),
        invalidate,
      }),
    [actorUserId, invalidate, mutate, organizationId],
  )

  const createWebhookSubscription = useCallback(
    (body: RequestBody) =>
      mutate<WebhookSubscription>({
        path: endpoints.integrations.createWebhookSubscription,
        method: 'POST',
        body: scopedBody(body, organizationId, actorUserId),
        invalidate,
      }),
    [actorUserId, invalidate, mutate, organizationId],
  )

  return {
    listOutbox,
    listReconciliation,
    listWebhookSubscriptions,
    getFabricStatus,
    listWorkerHeartbeats,
    listTimeline,
    queueFabricAnchor,
    queueEsignPackage,
    queueErpSync,
    queueFinanceApiNotification,
    queueWebhookDelivery,
    createWebhookSubscription,
  }
}

function scopedBody(
  body: RequestBody,
  organizationId?: string | null,
  actorUserId?: string | null,
) {
  return {
    ...body,
    organizationId,
    actorUserId,
  }
}

function requireSession(organizationId?: string | null) {
  if (!organizationId) {
    throw new Error('Active organization session required')
  }
}

function requireActor(actorUserId?: string | null) {
  if (!actorUserId) {
    throw new Error('Active user session required')
  }
}
