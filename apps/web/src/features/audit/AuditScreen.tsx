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
      {state.status === 'ready' ? <AuditEventList events={state.data} /> : null}
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

function AuditEventList({ events }: { events: AuditEvent[] }) {
  return events.length ? (
    <div className="data-table data-table--audit">
      {events.map((event) => (
        <article key={event.id}>
          <strong>{event.eventType}</strong>
          <span>{event.entityType ?? 'System'}</span>
          <span>{event.actorUser?.displayName ?? 'System'}</span>
          <span>{formatDateTime(event.createdAt)}</span>
          {event.entityType && event.entityId ? (
            <Link to={sourcePathFor(event.entityType, event.entityId)}>
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
