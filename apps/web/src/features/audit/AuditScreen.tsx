import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'

import { useAppSession } from '../../app/session'
import { PageHeader } from '../../layouts/PageHeader'
import { EmptyState } from '../../shared/components/EmptyState'
import { ErrorState } from '../../shared/components/ErrorState'
import { Field } from '../../shared/components/Field'
import type { AuditEvent, LoadState } from '../../shared/types'
import { formatDateTime } from '../../shared/utils/formatting'
import { useAuditEvents } from './api/useAuditEvents'
import type { AuditSearchParams } from './api/useAuditEvents'
import {
  anchorStatusCssClass,
  anchorStatusLabel,
  summarizeAnchorStatuses,
  toVerifiableAuditEvent,
} from './verification/auditVerification.model'
import type { VerifiableAuditEvent } from './verification/auditVerification.types'

type AuditSearchResult = {
  items: AuditEvent[]
  total: number
  page: number
  pageSize: number
  pageCount: number
}

export function AuditScreen() {
  const { session } = useAppSession()
  const { listAuditEvents } = useAuditEvents(session)
  const [state, setState] = useState<LoadState<AuditEvent[]>>({
    status: 'loading',
  })

  const loadAuditEvents = useCallback(
    () => listAuditEvents<AuditEvent>(),
    [listAuditEvents],
  )

  useEffect(() => {
    let cancelled = false

    loadAuditEvents()
      .then((rows) => {
        if (!cancelled) {
          setState({ status: 'ready', data: rows })
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({
            status: 'error',
            message: error instanceof Error ? error.message : 'Unable to load audit',
          })
        }
      })

    return () => {
      cancelled = true
    }
  }, [loadAuditEvents])

  return (
    <>
      <PageHeader
        eyebrow="Audit context"
        title="Audit events"
        action={<Link to="/audit/search">Search</Link>}
      />
      {state.status === 'loading' ? <EmptyState>Loading audit...</EmptyState> : null}
      {state.status === 'error' ? <ErrorState message={state.message} /> : null}
      {state.status === 'ready' ? (
        <>
          <TamperEvidenceOverview events={state.data} />
          <DocumentHashVerificationPanel events={state.data} />
          <AuditEventList events={state.data} />
        </>
      ) : null}
    </>
  )
}

export function AuditSearchScreen() {
  const { session } = useAppSession()
  const { searchAuditEvents } = useAuditEvents(session)
  const [eventType, setEventType] = useState('')
  const [actorUserId, setActorUserId] = useState('')
  const [entityType, setEntityType] = useState('')
  const [entityId, setEntityId] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [result, setResult] = useState<AuditSearchResult | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const params = useCallback(
    (nextPage: number): AuditSearchParams => ({
      eventType,
      actorUserId,
      entityType,
      entityId,
      from,
      to,
      page: nextPage,
      pageSize: 25,
    }),
    [actorUserId, entityId, entityType, eventType, from, to],
  )

  const runSearch = useCallback(
    async (nextPage: number) => {
      const rows = await searchAuditEvents<AuditSearchResult>(params(nextPage))
      setResult(rows)
    },
    [params, searchAuditEvents],
  )

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage(null)

    try {
      await runSearch(1)
      setMessage('Audit search updated')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to search audit')
    }
  }

  async function goToPage(nextPage: number) {
    setMessage(null)

    try {
      await runSearch(nextPage)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to load page')
    }
  }

  return (
    <>
      <PageHeader eyebrow="Audit context" title="Audit search" />
      <form className="form-grid" onSubmit={(event) => void submit(event)}>
        <h2>Filter events</h2>
        <Field
          label="Event type"
          name="eventType"
          value={eventType}
          onChange={setEventType}
        />
        <Field
          label="Actor user ID"
          name="actorUserId"
          value={actorUserId}
          onChange={setActorUserId}
        />
        <Field
          label="Entity type"
          name="entityType"
          value={entityType}
          onChange={setEntityType}
        />
        <Field
          label="Entity ID"
          name="entityId"
          value={entityId}
          onChange={setEntityId}
        />
        <Field label="From date" name="from" type="date" value={from} onChange={setFrom} />
        <Field label="To date" name="to" type="date" value={to} onChange={setTo} />
        <div className="form-actions">
          <button type="submit">Search audit</button>
          {message ? <p className="notice">{message}</p> : null}
        </div>
      </form>
      {result ? (
        <>
          <section className="table-section">
            <h2>
              Results ({result.total}) page {result.page} of {result.pageCount}
            </h2>
            <AuditEventList events={result.items} />
          </section>
          <div className="inline-actions">
            <button
              type="button"
              disabled={result.page <= 1}
              onClick={() => void goToPage(result.page - 1)}
            >
              Previous
            </button>
            <button
              type="button"
              disabled={result.page >= result.pageCount}
              onClick={() => void goToPage(result.page + 1)}
            >
              Next
            </button>
          </div>
        </>
      ) : (
        <EmptyState>No audit search loaded.</EmptyState>
      )}
    </>
  )
}

export function AuditEntityScreen() {
  const { session } = useAppSession()
  const { entityType = '', entityId = '' } = useParams()
  const { listEntityTimeline } = useAuditEvents(session)
  const [state, setState] = useState<LoadState<AuditEvent[]>>({
    status: 'loading',
  })

  const loadTimeline = useCallback(
    () => listEntityTimeline<AuditEvent>(entityType, entityId),
    [entityId, entityType, listEntityTimeline],
  )

  useEffect(() => {
    let cancelled = false

    loadTimeline()
      .then((rows) => {
        if (!cancelled) {
          setState({ status: 'ready', data: rows })
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({
            status: 'error',
            message:
              error instanceof Error ? error.message : 'Unable to load timeline',
          })
        }
      })

    return () => {
      cancelled = true
    }
  }, [loadTimeline])

  return (
    <>
      <PageHeader eyebrow="Audit timeline" title={`${entityType} timeline`} />
      {state.status === 'loading' ? <EmptyState>Loading timeline...</EmptyState> : null}
      {state.status === 'error' ? <ErrorState message={state.message} /> : null}
      {state.status === 'ready' ? <AuditEventList events={state.data} /> : null}
    </>
  )
}

function TamperEvidenceOverview({ events }: { events: AuditEvent[] }) {
  const summary = summarizeAnchorStatuses(events)

  return (
    <section className="audit-verification-summary">
      {summary.map((item) => (
        <article key={item.status}>
          <span>{item.label}</span>
          <strong>{item.count}</strong>
        </article>
      ))}
    </section>
  )
}

function DocumentHashVerificationPanel({ events }: { events: AuditEvent[] }) {
  const verifiableEvents = events
    .map(toVerifiableAuditEvent)
    .filter((event) => event.documentHash)
    .slice(0, 4)

  return (
    <section className="audit-verification-panel">
      <div className="section-heading-row">
        <div>
          <h2>Document hash verification</h2>
          <p>
            Hash and anchor fields are shown only when the backend audit metadata
            includes them. Missing Fabric data remains pending or unavailable.
          </p>
        </div>
        <Link to="/evidence/hashes">Open hash records</Link>
      </div>
      {verifiableEvents.length ? (
        <div className="audit-hash-grid">
          {verifiableEvents.map((event) => (
            <article key={event.id}>
              <span>
                {event.businessObjectType} / {event.businessObjectId}
              </span>
              <strong className="hash-text">{event.documentHash}</strong>
              <AnchorStatusBadge event={event} />
            </article>
          ))}
        </div>
      ) : (
        <EmptyState>
          No document hashes are attached to the current audit events.
        </EmptyState>
      )}
    </section>
  )
}

function AuditEventList({ events }: { events: AuditEvent[] }) {
  const verifiableEvents = events.map(toVerifiableAuditEvent)

  return events.length ? (
    <div className="audit-event-list">
      {verifiableEvents.map((event) => (
        <article key={event.id}>
          <div>
            <strong>{event.eventType}</strong>
            <span>{event.summary}</span>
          </div>
          <div>
            <span>Actor</span>
            <strong>{event.actorDisplayName}</strong>
          </div>
          <div>
            <span>Occurred</span>
            <strong>{formatDateTime(event.occurredAt)}</strong>
          </div>
          <div>
            <span>Document hash</span>
            <strong className="hash-text">
              {event.documentHash ?? 'No hash attached'}
            </strong>
          </div>
          <div>
            <span>Fabric anchor</span>
            <AnchorStatusBadge event={event} />
            <small>{event.verificationNote}</small>
          </div>
          <div>
            <span>Outbox</span>
            <strong>{outboxStatusLabel(event)}</strong>
          </div>
          {event.businessObjectType !== 'System' && event.businessObjectId ? (
            <Link
              to={sourcePathFor(event.businessObjectType, event.businessObjectId)}
            >
              Source
            </Link>
          ) : null}
        </article>
      ))}
    </div>
  ) : (
    <EmptyState>No audit events found.</EmptyState>
  )
}

function AnchorStatusBadge({ event }: { event: VerifiableAuditEvent }) {
  return (
    <span className={anchorStatusCssClass(event.fabricAnchorStatus)}>
      {anchorStatusLabel(event.fabricAnchorStatus)}
    </span>
  )
}

function outboxStatusLabel(event: VerifiableAuditEvent) {
  if (event.outboxStatus === 'none') {
    return 'No anchor job'
  }

  if (event.outboxEventId) {
    return `${event.outboxStatus} (${event.outboxEventId})`
  }

  return event.outboxStatus
}

function sourcePathFor(entityType: string, entityId: string) {
  const knownPaths: Record<string, string> = {
    Requisition: `/procurement/requisitions/${entityId}`,
    Supplier: `/procurement/suppliers/${entityId}`,
    RFQ: `/procurement/rfqs/${entityId}`,
    PurchaseOrder: `/procurement/purchase-orders/${entityId}`,
    EvidencePack: `/evidence/packs/${entityId}`,
    Document: `/evidence/documents/${entityId}`,
    HashRecord: `/evidence/hashes/${entityId}`,
  }

  return (
    knownPaths[entityType] ??
    `/audit/entity/${encodeURIComponent(entityType)}/${encodeURIComponent(entityId)}`
  )
}
