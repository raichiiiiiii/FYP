import { useCallback, useEffect, useMemo, useState } from 'react'

import { PageHeader } from '../../layouts/PageHeader'
import { apiRequest } from '../../shared/api/client'
import { getErrorMessage } from '../../shared/api/errors'
import { EmptyState } from '../../shared/components/EmptyState'
import { ErrorState } from '../../shared/components/ErrorState'
import { LoadingState } from '../../shared/components/LoadingState'
import { StatusBadge } from '../../shared/components/StatusBadge'
import type { AppSession, HealthResponse, LoadState } from '../../shared/types'
import { formatDateTime } from '../../shared/utils/formatting'
import {
  type OutboxEventView,
  type ReconciliationRecord,
  type WebhookSubscription,
  useIntegrations,
} from '../integrations/api/useIntegrations'
import { IntegrationStatusCards } from '../integrations/status/IntegrationStatusCards'
import {
  buildIntegrationStatusCards,
  buildOperationalHealthItems,
  integrationHealthLabel,
  summarizeOperationalHealth,
} from '../integrations/status/integrationStatus.model'

type OperationsData = {
  health: HealthResponse | null
  healthError?: string
  outbox: OutboxEventView[]
  reconciliation: ReconciliationRecord[]
  subscriptions: WebhookSubscription[]
  warnings: string[]
}

export function OperationsRoute({ session }: { session: AppSession }) {
  const { listOutbox, listReconciliation, listWebhookSubscriptions } =
    useIntegrations(session)
  const [dataState, setDataState] = useState<LoadState<OperationsData>>({
    status: 'loading',
  })

  const loadOperations = useCallback(async () => {
    setDataState({ status: 'loading' })

    const [healthResult, outboxResult, reconciliationResult, subscriptionsResult] =
      await Promise.allSettled([
        apiRequest<HealthResponse>('/health'),
        listOutbox(),
        listReconciliation(),
        listWebhookSubscriptions(),
      ])

    const health =
      healthResult.status === 'fulfilled' ? healthResult.value : null
    const outbox = outboxResult.status === 'fulfilled' ? outboxResult.value : []
    const reconciliation =
      reconciliationResult.status === 'fulfilled'
        ? reconciliationResult.value
        : []
    const subscriptions =
      subscriptionsResult.status === 'fulfilled' ? subscriptionsResult.value : []
    const warnings = [
      resultWarning('API health', healthResult),
      resultWarning('Outbox', outboxResult),
      resultWarning('Reconciliation', reconciliationResult),
      resultWarning('Webhook subscriptions', subscriptionsResult),
    ].filter((warning): warning is string => Boolean(warning))

    if (!health && outboxResult.status === 'rejected') {
      setDataState({
        status: 'error',
        message:
          warnings.join(' ') ||
          'Unable to load operations health or integration status.',
      })
      return
    }

    setDataState({
      status: 'ready',
      data: {
        health,
        healthError:
          healthResult.status === 'rejected'
            ? getErrorMessage(healthResult.reason, 'API health unavailable')
            : undefined,
        outbox,
        reconciliation,
        subscriptions,
        warnings,
      },
    })
  }, [listOutbox, listReconciliation, listWebhookSubscriptions])

  useEffect(() => {
    let cancelled = false

    Promise.resolve().then(() => {
      if (!cancelled) {
        void loadOperations()
      }
    })

    return () => {
      cancelled = true
    }
  }, [loadOperations])

  const data = dataState.status === 'ready' ? dataState.data : null
  const healthItems = useMemo(
    () =>
      data
        ? buildOperationalHealthItems({
            health: data.health,
            healthError: data.healthError,
            outbox: data.outbox,
          })
        : [],
    [data],
  )
  const integrationStatuses = useMemo(
    () =>
      data
        ? buildIntegrationStatusCards({
            outbox: data.outbox,
            reconciliation: data.reconciliation,
            subscriptions: data.subscriptions,
          })
        : [],
    [data],
  )
  const readiness = useMemo(
    () => summarizeOperationalHealth(healthItems),
    [healthItems],
  )

  return (
    <>
      <PageHeader
        eyebrow="Operations"
        title="Deployment and runtime health"
        action={
          <button type="button" onClick={() => void loadOperations()}>
            Refresh status
          </button>
        }
      />

      {dataState.status === 'loading' ? (
        <LoadingState message="Checking API, database, Redis, outbox, and deployment readiness..." />
      ) : null}

      {dataState.status === 'error' ? (
        <ErrorState title="Operations status unavailable" message={dataState.message} />
      ) : null}

      {data ? (
        <>
          <section className="operations-readiness">
            <article>
              <span>Prototype readiness</span>
              <strong>
                {readiness.productionReady
                  ? 'Production ready'
                  : 'Production readiness blocked'}
              </strong>
              <p>
                Healthy {readiness.healthy} / degraded {readiness.degraded} /
                unavailable {readiness.unavailable} / not configured{' '}
                {readiness.notConfigured} / pending {readiness.pending}
              </p>
            </article>
            <article>
              <span>Current environment</span>
              <strong>{data.health?.environment ?? import.meta.env.MODE}</strong>
              <p>
                Last API health check:{' '}
                {data.health?.timestamp
                  ? formatDateTime(data.health.timestamp)
                  : 'Unavailable'}
              </p>
            </article>
          </section>

          {data.warnings.length ? (
            <ErrorState
              title="Partial operations data"
              message={data.warnings.join(' ')}
            />
          ) : null}

          <section className="status-card-section">
            <div className="section-heading">
              <div>
                <span className="eyebrow">Runtime services</span>
                <h2>Operational health</h2>
              </div>
            </div>
            <div className="status-card-grid status-card-grid--operations">
              {healthItems.map((item) => (
                <article
                  key={item.id}
                  className={`status-card status-card--${item.status}`}
                >
                  <div className="status-card-header">
                    <span>{item.name}</span>
                    <StatusBadge status={item.status} />
                  </div>
                  <strong>{integrationHealthLabel(item.status)}</strong>
                  <p>{item.message}</p>
                  <small>
                    {item.lastCheckedAt
                      ? formatDateTime(item.lastCheckedAt)
                      : 'No timestamp available'}
                  </small>
                </article>
              ))}
            </div>
          </section>

          <IntegrationStatusCards
            title="Adapter and outbox visibility"
            statuses={integrationStatuses}
          />

          <section className="table-section">
            <h2>Backup and restore status</h2>
            <EmptyState title="Backup endpoint not connected">
              Backup freshness, restore-test status, and RPO/RTO reporting are
              required before production readiness can be confirmed. This page
              does not claim those controls are healthy.
            </EmptyState>
          </section>
        </>
      ) : null}
    </>
  )
}

function resultWarning(label: string, result: PromiseSettledResult<unknown>) {
  if (result.status === 'fulfilled') {
    return null
  }

  return `${label}: ${getErrorMessage(result.reason, 'unavailable')}.`
}
