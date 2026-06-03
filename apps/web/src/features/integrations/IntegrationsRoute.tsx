import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

import { PageHeader } from '../../layouts/PageHeader'
import { EmptyState } from '../../shared/components/EmptyState'
import { ErrorState } from '../../shared/components/ErrorState'
import { Field } from '../../shared/components/Field'
import { LoadingState } from '../../shared/components/LoadingState'
import { StatusBadge } from '../../shared/components/StatusBadge'
import type { AppSession, LoadState } from '../../shared/types'
import { formatDateTime } from '../../shared/utils/formatting'
import {
  type OutboxEventView,
  type ReconciliationRecord,
  type WebhookSubscription,
  useIntegrations,
} from './api/useIntegrations'
import { IntegrationStatusCards } from './status/IntegrationStatusCards'
import { buildIntegrationStatusCards } from './status/integrationStatus.model'

type IntegrationData = {
  outbox: OutboxEventView[]
  reconciliation: ReconciliationRecord[]
  subscriptions: WebhookSubscription[]
}

type FabricForm = {
  entityType: string
  entityId: string
  canonicalHash: string
}

type EsignForm = {
  aggregateType: string
  aggregateId: string
  signerEmail: string
  documentId: string
}

type ErpForm = {
  aggregateType: string
  aggregateId: string
  payload: string
}

type FinanceApiForm = {
  aggregateType: string
  aggregateId: string
  notificationType: string
  payload: string
}

type WebhookSubscriptionForm = {
  eventType: string
  targetUrl: string
}

type WebhookDeliveryForm = {
  aggregateType: string
  aggregateId: string
  eventType: string
  targetUrl: string
  payload: string
}

const emptyData: IntegrationData = {
  outbox: [],
  reconciliation: [],
  subscriptions: [],
}

export function IntegrationsRoute({
  session,
  canRequestActions,
}: {
  session: AppSession
  canRequestActions: boolean
}) {
  const {
    listOutbox,
    listReconciliation,
    listWebhookSubscriptions,
    queueFabricAnchor,
    queueEsignPackage,
    queueErpSync,
    queueFinanceApiNotification,
    queueWebhookDelivery,
    createWebhookSubscription,
  } = useIntegrations(session)
  const [dataState, setDataState] = useState<LoadState<IntegrationData>>({
    status: 'loading',
  })
  const [notice, setNotice] = useState('')
  const [formError, setFormError] = useState('')
  const [fabricForm, setFabricForm] = useState<FabricForm>({
    entityType: 'PurchaseOrder',
    entityId: '',
    canonicalHash: '',
  })
  const [esignForm, setEsignForm] = useState<EsignForm>({
    aggregateType: 'MudarabahContract',
    aggregateId: '',
    signerEmail: '',
    documentId: '',
  })
  const [erpForm, setErpForm] = useState<ErpForm>({
    aggregateType: 'PurchaseOrder',
    aggregateId: '',
    payload: '{}',
  })
  const [financeApiForm, setFinanceApiForm] = useState<FinanceApiForm>({
    aggregateType: 'MudarabahApplication',
    aggregateId: '',
    notificationType: 'APPLICATION_APPROVED',
    payload: '{}',
  })
  const [subscriptionForm, setSubscriptionForm] =
    useState<WebhookSubscriptionForm>({
      eventType: 'EVIDENCE_PACK_EXPORT_REQUESTED',
      targetUrl: '',
    })
  const [deliveryForm, setDeliveryForm] = useState<WebhookDeliveryForm>({
    aggregateType: 'EvidencePack',
    aggregateId: '',
    eventType: 'EVIDENCE_PACK_EXPORT_REQUESTED',
    targetUrl: '',
    payload: '{}',
  })

  const loadIntegrations = useCallback(async () => {
    setDataState({ status: 'loading' })
    try {
      const [outbox, reconciliation, subscriptions] = await Promise.all([
        listOutbox(),
        listReconciliation(),
        listWebhookSubscriptions(),
      ])
      setDataState({
        status: 'ready',
        data: { outbox, reconciliation, subscriptions },
      })
    } catch (error) {
      setDataState({
        status: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Unable to load integration status',
      })
    }
  }, [listOutbox, listReconciliation, listWebhookSubscriptions])

  useEffect(() => {
    let cancelled = false

    Promise.resolve().then(() => {
      if (!cancelled) {
        void loadIntegrations()
      }
    })

    return () => {
      cancelled = true
    }
  }, [loadIntegrations])

  const data = dataState.status === 'ready' ? dataState.data : emptyData
  const statusCounts = useMemo(() => countStatuses(data.outbox), [data.outbox])
  const reliability = useMemo(
    () => summarizeOutboxReliability(data.outbox),
    [data.outbox],
  )
  const integrationStatuses = useMemo(
    () =>
      dataState.status === 'ready'
        ? buildIntegrationStatusCards({
            outbox: data.outbox,
            reconciliation: data.reconciliation,
            subscriptions: data.subscriptions,
          })
        : [],
    [data.outbox, data.reconciliation, data.subscriptions, dataState.status],
  )

  const submitFabric = useCallback(async () => {
    if (!requireFields(fabricForm.entityId, fabricForm.canonicalHash)) {
      setFormError('Entity ID and canonical hash are required.')
      return
    }

    await submitRequest(
      () => queueFabricAnchor(fabricForm),
      'Fabric anchor request queued.',
      { setNotice, setFormError, loadIntegrations },
    )
  }, [fabricForm, loadIntegrations, queueFabricAnchor])

  const submitEsign = useCallback(async () => {
    if (
      !requireFields(
        esignForm.aggregateId,
        esignForm.signerEmail,
        esignForm.documentId,
      )
    ) {
      setFormError('Contract ID, signer email, and document ID are required.')
      return
    }

    await submitRequest(
      () => queueEsignPackage(esignForm),
      'E-signature package request queued.',
      { setNotice, setFormError, loadIntegrations },
    )
  }, [esignForm, loadIntegrations, queueEsignPackage])

  const submitErp = useCallback(async () => {
    if (!requireFields(erpForm.aggregateId)) {
      setFormError('Aggregate ID is required for ERP sync.')
      return
    }

    const payload = parseJson(erpForm.payload)
    if (payload.status === 'error') {
      setFormError(payload.message)
      return
    }

    await submitRequest(
      () =>
        queueErpSync({
          aggregateType: erpForm.aggregateType,
          aggregateId: erpForm.aggregateId,
          payload: payload.value,
        }),
      'ERP sync request queued.',
      { setNotice, setFormError, loadIntegrations },
    )
  }, [erpForm, loadIntegrations, queueErpSync])

  const submitFinanceApi = useCallback(async () => {
    if (
      !requireFields(
        financeApiForm.aggregateId,
        financeApiForm.notificationType,
      )
    ) {
      setFormError('Application ID and notification type are required.')
      return
    }

    const payload = parseJson(financeApiForm.payload)
    if (payload.status === 'error') {
      setFormError(payload.message)
      return
    }

    await submitRequest(
      () =>
        queueFinanceApiNotification({
          aggregateType: financeApiForm.aggregateType,
          aggregateId: financeApiForm.aggregateId,
          notificationType: financeApiForm.notificationType,
          payload: payload.value,
        }),
      'Finance API notification request queued.',
      { setNotice, setFormError, loadIntegrations },
    )
  }, [financeApiForm, loadIntegrations, queueFinanceApiNotification])

  const submitSubscription = useCallback(async () => {
    if (!requireFields(subscriptionForm.eventType, subscriptionForm.targetUrl)) {
      setFormError('Webhook event type and target URL are required.')
      return
    }

    await submitRequest(
      () => createWebhookSubscription(subscriptionForm),
      'Webhook subscription saved.',
      { setNotice, setFormError, loadIntegrations },
    )
  }, [createWebhookSubscription, loadIntegrations, subscriptionForm])

  const submitDelivery = useCallback(async () => {
    if (
      !requireFields(
        deliveryForm.aggregateId,
        deliveryForm.eventType,
        deliveryForm.targetUrl,
      )
    ) {
      setFormError('Webhook aggregate ID, event type, and target URL are required.')
      return
    }

    const payload = parseJson(deliveryForm.payload)
    if (payload.status === 'error') {
      setFormError(payload.message)
      return
    }

    await submitRequest(
      () =>
        queueWebhookDelivery({
          aggregateType: deliveryForm.aggregateType,
          aggregateId: deliveryForm.aggregateId,
          eventType: deliveryForm.eventType,
          targetUrl: deliveryForm.targetUrl,
          payload: payload.value,
        }),
      'Webhook delivery request queued.',
      { setNotice, setFormError, loadIntegrations },
    )
  }, [deliveryForm, loadIntegrations, queueWebhookDelivery])

  return (
    <>
      <PageHeader eyebrow="Integrations" title="Outbox adapter control" />
      <section className="integration-hero" aria-label="Integration boundary">
        <div>
          <span>Adapter boundary</span>
          <h2>External effects are queued, retried, and reconciled.</h2>
          <p>
            Fabric, ERP, e-signature, finance API, and webhook requests are
            routed through the durable outbox. Current providers are mock
            adapters unless a backend health probe or reconciliation record
            explicitly says otherwise.
          </p>
        </div>
        <div className="integration-hero-warning">
          <strong>Mock-first integration mode</strong>
          <p>
            Do not treat completed mock reconciliation as proof that a real
            external provider is configured or healthy.
          </p>
        </div>
      </section>

      <section className="details-grid integration-summary-grid">
        <article>
          <span>Pending</span>
          <strong>{statusCounts.PENDING}</strong>
        </article>
        <article>
          <span>Processing</span>
          <strong>{statusCounts.PROCESSING}</strong>
        </article>
        <article>
          <span>Retrying</span>
          <strong>{statusCounts.RETRYING}</strong>
        </article>
        <article>
          <span>Failed</span>
          <strong>{statusCounts.FAILED}</strong>
        </article>
        <article>
          <span>Completed</span>
          <strong>{statusCounts.COMPLETED}</strong>
        </article>
        <article>
          <span>Idempotent requests</span>
          <strong>{reliability.idempotencyKeyCount}</strong>
        </article>
      </section>

      {integrationStatuses.length ? (
        <IntegrationStatusCards statuses={integrationStatuses} />
      ) : null}

      <section className="integration-ops-grid" aria-label="Integration controls summary">
        <article>
          <span>Retry model</span>
          <strong>Idempotent outbox</strong>
          <p>
            Retrying an event re-attempts the external side effect only. The
            idempotency key protects the underlying business record from
            duplicate provider effects.
          </p>
        </article>
        <article>
          <span>Worker visibility</span>
          <strong>
            {reliability.actionRequiredCount
              ? `${reliability.actionRequiredCount} need review`
              : 'No failed retries visible'}
          </strong>
          <p>
            Worker health is inferred from outbox movement here. A dedicated
            worker health endpoint is still required before production readiness
            can be claimed.
          </p>
        </article>
        <article>
          <span>Reconciliation</span>
          <strong>{data.reconciliation.length} records</strong>
          <p>
            Reconciliation rows link MEPN events to mock external references or
            failed provider attempts. They are evidence of processing, not live
            provider monitoring.
          </p>
        </article>
      </section>

      {canRequestActions ? (
        <>
          <section className="integration-section-heading">
            <span className="eyebrow">Mock adapter requests</span>
            <h2>Queue external side effects</h2>
            <p>
              These controls create outbox events and audit-backed requests.
              They do not call real Fabric, ERP, e-signature, or finance
              providers in the current MVP.
            </p>
          </section>
        <section className="integration-action-grid">
          <IntegrationActionPanel title="Mock Fabric anchor">
            <Field
              label="Entity type"
              name="fabricEntityType"
              value={fabricForm.entityType}
              onChange={(value) =>
                setFabricForm((current) => ({ ...current, entityType: value }))
              }
            />
            <Field
              label="Entity ID"
              name="fabricEntityId"
              required
              value={fabricForm.entityId}
              onChange={(value) =>
                setFabricForm((current) => ({ ...current, entityId: value }))
              }
            />
            <Field
              label="Canonical SHA-256 hash"
              name="fabricHash"
              required
              value={fabricForm.canonicalHash}
              onChange={(value) =>
                setFabricForm((current) => ({
                  ...current,
                  canonicalHash: value,
                }))
              }
            />
            <button type="button" onClick={submitFabric}>
              Request anchor
            </button>
          </IntegrationActionPanel>

          <IntegrationActionPanel title="Mock e-signature package">
            <Field
              label="Contract type"
              name="esignAggregateType"
              value={esignForm.aggregateType}
              onChange={(value) =>
                setEsignForm((current) => ({ ...current, aggregateType: value }))
              }
            />
            <Field
              label="Contract ID"
              name="esignAggregateId"
              required
              value={esignForm.aggregateId}
              onChange={(value) =>
                setEsignForm((current) => ({ ...current, aggregateId: value }))
              }
            />
            <Field
              label="Signer email"
              name="signerEmail"
              required
              value={esignForm.signerEmail}
              onChange={(value) =>
                setEsignForm((current) => ({ ...current, signerEmail: value }))
              }
            />
            <Field
              label="Document ID"
              name="documentId"
              required
              value={esignForm.documentId}
              onChange={(value) =>
                setEsignForm((current) => ({ ...current, documentId: value }))
              }
            />
            <button type="button" onClick={submitEsign}>
              Request package
            </button>
          </IntegrationActionPanel>

          <IntegrationActionPanel title="Mock ERP sync">
            <Field
              label="Aggregate type"
              name="erpAggregateType"
              value={erpForm.aggregateType}
              onChange={(value) =>
                setErpForm((current) => ({ ...current, aggregateType: value }))
              }
            />
            <Field
              label="Aggregate ID"
              name="erpAggregateId"
              required
              value={erpForm.aggregateId}
              onChange={(value) =>
                setErpForm((current) => ({ ...current, aggregateId: value }))
              }
            />
            <JsonField
              label="ERP payload JSON"
              name="erpPayload"
              value={erpForm.payload}
              onChange={(value) =>
                setErpForm((current) => ({ ...current, payload: value }))
              }
            />
            <button type="button" onClick={submitErp}>
              Request ERP sync
            </button>
          </IntegrationActionPanel>

          <IntegrationActionPanel title="Mock finance API notification">
            <Field
              label="Aggregate type"
              name="financeApiAggregateType"
              value={financeApiForm.aggregateType}
              onChange={(value) =>
                setFinanceApiForm((current) => ({
                  ...current,
                  aggregateType: value,
                }))
              }
            />
            <Field
              label="Application ID"
              name="financeApiAggregateId"
              required
              value={financeApiForm.aggregateId}
              onChange={(value) =>
                setFinanceApiForm((current) => ({
                  ...current,
                  aggregateId: value,
                }))
              }
            />
            <Field
              label="Notification type"
              name="financeApiNotificationType"
              required
              value={financeApiForm.notificationType}
              onChange={(value) =>
                setFinanceApiForm((current) => ({
                  ...current,
                  notificationType: value,
                }))
              }
            />
            <JsonField
              label="Notification payload JSON"
              name="financeApiPayload"
              value={financeApiForm.payload}
              onChange={(value) =>
                setFinanceApiForm((current) => ({
                  ...current,
                  payload: value,
                }))
              }
            />
            <button type="button" onClick={submitFinanceApi}>
              Request notification
            </button>
          </IntegrationActionPanel>

          <IntegrationActionPanel title="Webhook subscription">
            <Field
              label="Event type"
              name="subscriptionEventType"
              required
              value={subscriptionForm.eventType}
              onChange={(value) =>
                setSubscriptionForm((current) => ({
                  ...current,
                  eventType: value,
                }))
              }
            />
            <Field
              label="Target URL"
              name="subscriptionTargetUrl"
              required
              value={subscriptionForm.targetUrl}
              onChange={(value) =>
                setSubscriptionForm((current) => ({
                  ...current,
                  targetUrl: value,
                }))
              }
            />
            <button type="button" onClick={submitSubscription}>
              Save subscription
            </button>
          </IntegrationActionPanel>

          <IntegrationActionPanel title="Webhook delivery">
            <Field
              label="Aggregate type"
              name="deliveryAggregateType"
              value={deliveryForm.aggregateType}
              onChange={(value) =>
                setDeliveryForm((current) => ({
                  ...current,
                  aggregateType: value,
                }))
              }
            />
            <Field
              label="Aggregate ID"
              name="deliveryAggregateId"
              required
              value={deliveryForm.aggregateId}
              onChange={(value) =>
                setDeliveryForm((current) => ({
                  ...current,
                  aggregateId: value,
                }))
              }
            />
            <Field
              label="Event type"
              name="deliveryEventType"
              required
              value={deliveryForm.eventType}
              onChange={(value) =>
                setDeliveryForm((current) => ({ ...current, eventType: value }))
              }
            />
            <Field
              label="Target URL"
              name="deliveryTargetUrl"
              required
              value={deliveryForm.targetUrl}
              onChange={(value) =>
                setDeliveryForm((current) => ({ ...current, targetUrl: value }))
              }
            />
            <JsonField
              label="Webhook payload JSON"
              name="webhookPayload"
              value={deliveryForm.payload}
              onChange={(value) =>
                setDeliveryForm((current) => ({ ...current, payload: value }))
              }
            />
            <button type="button" onClick={submitDelivery}>
              Request delivery
            </button>
          </IntegrationActionPanel>
        </section>
        </>
      ) : (
        <EmptyState title="Read-only integration view">
          Your role can inspect integration status, retry visibility, and
          reconciliation records. Request actions are reserved for organization
          admins.
        </EmptyState>
      )}

      {notice ? <p className="notice">{notice}</p> : null}
      {formError ? <p className="error-text">{formError}</p> : null}

      {dataState.status === 'loading' ? (
        <LoadingState message="Loading integration status..." />
      ) : null}
      {dataState.status === 'error' ? (
        <ErrorState
          title="Unable to load integration status"
          message={dataState.message}
        />
      ) : null}
      {dataState.status === 'ready' ? (
        <>
          <OutboxTable events={data.outbox} />
          <ReconciliationTable records={data.reconciliation} />
          <WebhookSubscriptionTable subscriptions={data.subscriptions} />
        </>
      ) : null}
    </>
  )
}

function IntegrationActionPanel({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section className="form-grid integration-action-panel">
      <h2>{title}</h2>
      <p className="integration-action-note">
        This queues an outbox event for the mock adapter boundary.
      </p>
      {children}
    </section>
  )
}

function JsonField({
  label,
  name,
  value,
  onChange,
}: {
  label: string
  name: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <textarea
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}

function OutboxTable({ events }: { events: OutboxEventView[] }) {
  return (
    <section className="table-section">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Retry and idempotency</span>
          <h2>Outbox events</h2>
        </div>
      </div>
      {events.length ? (
        <div className="data-table data-table--integrations">
          {events.map((event) => (
            <article key={event.id}>
              <div>
                <span>Event</span>
                <strong>{event.eventType}</strong>
              </div>
              <div>
                <span>Aggregate</span>
                <strong>
                  {event.aggregateType} / {event.aggregateId}
                </strong>
              </div>
              <div>
                <span>Status</span>
                <StatusBadge status={event.displayStatus} />
              </div>
              <div>
                <span>Attempts</span>
                <strong>{event.attempts}</strong>
              </div>
              <div>
                <span>Next run</span>
                <strong>{formatDateTime(event.nextRunAt)}</strong>
              </div>
              <div>
                <span>Idempotency key</span>
                <strong>{event.idempotencyKey || 'Not supplied'}</strong>
              </div>
              <div>
                <span>Reconciliation</span>
                <strong>
                  {event.reconciliationRecord
                    ? event.reconciliationRecord.status
                    : 'Pending worker'}
                </strong>
              </div>
              <div>
                <span>Error</span>
                <strong>{event.lastError || 'None'}</strong>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState>No integration requests have been queued yet.</EmptyState>
      )}
    </section>
  )
}

function ReconciliationTable({
  records,
}: {
  records: ReconciliationRecord[]
}) {
  return (
    <section className="table-section">
      <div className="section-heading">
        <div>
          <span className="eyebrow">External reference mapping</span>
          <h2>Reconciliation records</h2>
        </div>
      </div>
      {records.length ? (
        <div className="data-table data-table--reconciliation">
          {records.map((record) => (
            <article key={record.id}>
              <div>
                <span>Integration</span>
                <strong>{record.integrationType}</strong>
              </div>
              <div>
                <span>Aggregate</span>
                <strong>
                  {record.aggregateType} / {record.aggregateId}
                </strong>
              </div>
              <div>
                <span>Status</span>
                <StatusBadge status={record.status} />
              </div>
              <div>
                <span>Reference</span>
                <strong>{record.externalReference || 'Pending'}</strong>
              </div>
              <div>
                <span>Attempts</span>
                <strong>{record.attempts}</strong>
              </div>
              <div>
                <span>Error</span>
                <strong>{record.lastError || 'None'}</strong>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState>
          Reconciliation records appear after the worker processes outbox events.
        </EmptyState>
      )}
    </section>
  )
}

function WebhookSubscriptionTable({
  subscriptions,
}: {
  subscriptions: WebhookSubscription[]
}) {
  return (
    <section className="table-section">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Mock webhook delivery</span>
          <h2>Webhook subscriptions</h2>
        </div>
      </div>
      {subscriptions.length ? (
        <div className="data-table data-table--webhooks">
          {subscriptions.map((subscription) => (
            <article key={subscription.id}>
              <div>
                <span>Event</span>
                <strong>{subscription.eventType}</strong>
              </div>
              <div>
                <span>Target</span>
                <strong>{subscription.targetUrl}</strong>
              </div>
              <div>
                <span>Status</span>
                <StatusBadge status={subscription.status} />
              </div>
              <div>
                <span>Created</span>
                <strong>{formatDateTime(subscription.createdAt)}</strong>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState>No active webhook subscriptions found.</EmptyState>
      )}
    </section>
  )
}

async function submitRequest(
  request: () => Promise<unknown>,
  message: string,
  helpers: {
    setNotice: (message: string) => void
    setFormError: (message: string) => void
    loadIntegrations: () => Promise<void>
  },
) {
  helpers.setNotice('')
  helpers.setFormError('')

  try {
    await request()
    helpers.setNotice(message)
    await helpers.loadIntegrations()
  } catch (error) {
    helpers.setFormError(
      error instanceof Error ? error.message : 'Integration request failed',
    )
  }
}

function parseJson(value: string):
  | { status: 'ok'; value: Record<string, unknown> }
  | { status: 'error'; message: string } {
  try {
    const parsed = JSON.parse(value || '{}') as unknown

    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return { status: 'ok', value: parsed as Record<string, unknown> }
    }

    return { status: 'error', message: 'Payload JSON must be an object.' }
  } catch {
    return { status: 'error', message: 'Payload JSON is invalid.' }
  }
}

function requireFields(...values: string[]) {
  return values.every((value) => value.trim().length > 0)
}

function countStatuses(events: OutboxEventView[]) {
  return events.reduce(
    (counts, event) => ({
      ...counts,
      [event.displayStatus]: (counts[event.displayStatus] ?? 0) + 1,
    }),
    {
      PENDING: 0,
      PROCESSING: 0,
      RETRYING: 0,
      FAILED: 0,
      COMPLETED: 0,
    } as Record<string, number>,
  )
}

function summarizeOutboxReliability(events: OutboxEventView[]) {
  const actionRequiredCount = events.filter((event) =>
    ['FAILED', 'RETRYING'].includes(event.displayStatus),
  ).length
  const idempotencyKeyCount = events.filter((event) =>
    Boolean(event.idempotencyKey),
  ).length

  return {
    actionRequiredCount,
    idempotencyKeyCount,
  }
}
