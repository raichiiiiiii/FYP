import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { PageHeader } from '../../layouts/PageHeader'
import { apiRequest } from '../../shared/api/client'
import { endpoints } from '../../shared/api/endpoints'
import { getErrorMessage } from '../../shared/api/errors'
import { Button } from '../../shared/components/Button'
import { EmptyState } from '../../shared/components/EmptyState'
import { ErrorState } from '../../shared/components/ErrorState'
import { LoadingState } from '../../shared/components/LoadingState'
import { StatusBadge } from '../../shared/components/StatusBadge'
import type { AppSession, LoadState } from '../../shared/types'
import { formatDateTime } from '../../shared/utils/formatting'
import {
  buildReportCards,
  createEmptyReportsData,
  reportStatusLabel,
  summarizeReports,
  type ReportCategory,
  type ReportRecord,
  type ReportsData,
} from './reports.model'

type ReportsPayload = {
  data: ReportsData
  warnings: string[]
  loadedAt: string
}

const reportTabs: Array<{ id: ReportCategory; label: string }> = [
  { id: 'procurement', label: 'Procurement' },
  { id: 'finance', label: 'Finance' },
  { id: 'audit', label: 'Audit' },
  { id: 'integration', label: 'Integrations' },
]

export function ReportsRoute({ session }: { session: AppSession }) {
  const [activeCategory, setActiveCategory] =
    useState<ReportCategory>('procurement')
  const [state, setState] = useState<LoadState<ReportsPayload>>({
    status: 'loading',
  })

  const loadReports = useCallback(async (): Promise<ReportsPayload> => {
    if (!session.organizationId) {
      return {
        data: createEmptyReportsData(),
        warnings: ['Active organization context is required for reports.'],
        loadedAt: new Date().toISOString(),
      }
    }

    const requests: Array<{
      key: keyof ReportsData
      label: string
      path: string
    }> = [
      {
        key: 'projects',
        label: 'projects',
        path: endpoints.projects.list(session.organizationId),
      },
      {
        key: 'suppliers',
        label: 'suppliers',
        path: endpoints.suppliers.list(session.organizationId),
      },
      {
        key: 'requisitions',
        label: 'requisitions',
        path: endpoints.requisitions.list(session.organizationId),
      },
      {
        key: 'rfqs',
        label: 'RFQs',
        path: endpoints.rfqs.list(session.organizationId),
      },
      {
        key: 'quotations',
        label: 'quotations',
        path: endpoints.quotations.list(session.organizationId),
      },
      {
        key: 'purchaseOrders',
        label: 'purchase orders',
        path: endpoints.purchaseOrders.list(session.organizationId),
      },
      {
        key: 'matchingRecords',
        label: 'matching records',
        path: endpoints.procurementOperations.matching(session.organizationId),
      },
      {
        key: 'opportunities',
        label: 'opportunities',
        path: endpoints.opportunities.list(session.organizationId),
      },
      {
        key: 'applications',
        label: 'applications',
        path: endpoints.applications.list(session.organizationId),
      },
      {
        key: 'contracts',
        label: 'contracts',
        path: endpoints.contracts.list(session.organizationId),
      },
      {
        key: 'ledgerEntries',
        label: 'ledger entries',
        path: endpoints.ledgers.entries(session.organizationId),
      },
      {
        key: 'profitLossStatements',
        label: 'profit/loss statements',
        path: endpoints.profitLoss.statements(session.organizationId),
      },
      {
        key: 'closures',
        label: 'closures',
        path: endpoints.closures.list(session.organizationId),
      },
      {
        key: 'auditEvents',
        label: 'audit events',
        path: endpoints.auditEvents.list(session.organizationId),
      },
      {
        key: 'outboxEvents',
        label: 'outbox events',
        path: endpoints.integrations.outbox(session.organizationId),
      },
      {
        key: 'reconciliationRecords',
        label: 'reconciliation records',
        path: endpoints.integrations.reconciliation(session.organizationId),
      },
      {
        key: 'webhookSubscriptions',
        label: 'webhook subscriptions',
        path: endpoints.integrations.webhookSubscriptions(
          session.organizationId,
        ),
      },
    ]

    const results = await Promise.allSettled(
      requests.map((request) => apiRequest<ReportRecord[]>(request.path)),
    )
    const data = createEmptyReportsData()
    const warnings: string[] = []

    results.forEach((result, index) => {
      const request = requests[index]

      if (result.status === 'fulfilled') {
        data[request.key] = Array.isArray(result.value) ? result.value : []
        return
      }

      warnings.push(
        `${request.label}: ${getErrorMessage(result.reason, 'Unable to load report source')}`,
      )
    })

    return {
      data,
      warnings,
      loadedAt: new Date().toISOString(),
    }
  }, [session.organizationId])

  useEffect(() => {
    let cancelled = false

    loadReports()
      .then((payload) => {
        if (!cancelled) {
          setState({ status: 'ready', data: payload })
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({
            status: 'error',
            message: getErrorMessage(error, 'Unable to load reports'),
          })
        }
      })

    return () => {
      cancelled = true
    }
  }, [loadReports])

  const payload = state.status === 'ready' ? state.data : null
  const summary = useMemo(
    () => (payload ? summarizeReports(payload.data) : null),
    [payload],
  )
  const reportCards = useMemo(
    () => (payload ? buildReportCards(payload.data) : []),
    [payload],
  )
  const visibleCards = reportCards.filter(
    (card) => card.category === activeCategory,
  )

  return (
    <>
      <PageHeader
        eyebrow="Reports"
        title="Reports and review packs"
        action={
          <Button type="button" disabled title="Report export endpoint not implemented">
            Export unavailable
          </Button>
        }
      />

      <section className="reports-hero" aria-label="Reports implementation status">
        <div>
          <span>Read-only report catalogue</span>
          <h2>Review current records without implying finished exports.</h2>
          <p>
            This page aggregates existing API list endpoints for demo review.
            Dedicated report DTOs, scheduled exports, and downloadable report
            files are still blocked backend work.
          </p>
        </div>
        <div className="reports-hero-status">
          <strong>Exports are not implemented</strong>
          <p>
            Export buttons are disabled until report-generation endpoints exist.
            Evidence packs remain the current downloadable review artifact.
          </p>
        </div>
      </section>

      {state.status === 'loading' ? (
        <LoadingState message="Loading report source data..." />
      ) : null}
      {state.status === 'error' ? (
        <ErrorState title="Unable to load reports" message={state.message} />
      ) : null}

      {payload && summary ? (
        <>
          <section className="details-grid reports-summary-grid">
            <article>
              <span>Procurement records</span>
              <strong>{summary.procurementRecords}</strong>
            </article>
            <article>
              <span>Finance records</span>
              <strong>{summary.financeRecords}</strong>
            </article>
            <article>
              <span>Audit events</span>
              <strong>{summary.auditEvents}</strong>
            </article>
            <article>
              <span>Integration records</span>
              <strong>{summary.integrationRecords}</strong>
            </article>
            <article>
              <span>Blocked exports</span>
              <strong>{summary.blockedExports}</strong>
            </article>
            <article>
              <span>Loaded</span>
              <strong>{formatDateTime(payload.loadedAt)}</strong>
            </article>
          </section>

          {payload.warnings.length ? (
            <ErrorState
              title="Partial report data"
              message={payload.warnings.join(' ')}
            />
          ) : null}

          <section className="report-filter-row" aria-label="Report sections">
            <div>
              <span className="eyebrow">Report sections</span>
              <h2>Choose a review area</h2>
            </div>
            <div className="report-tab-list" role="tablist">
              {reportTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={activeCategory === tab.id}
                  className={
                    activeCategory === tab.id
                      ? 'report-tab report-tab--active'
                      : 'report-tab'
                  }
                  onClick={() => setActiveCategory(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </section>

          {visibleCards.length ? (
            <section className="report-card-grid">
              {visibleCards.map((card) => (
                <article key={card.id} className="report-card">
                  <div className="report-card-header">
                    <div>
                      <span>{card.source}</span>
                      <h2>{card.title}</h2>
                    </div>
                    <StatusBadge status={reportStatusLabel(card.status)} />
                  </div>
                  <p>{card.description}</p>
                  <div className="details-grid report-metric-grid">
                    <article>
                      <span>Primary metric</span>
                      <strong>{card.primaryMetric}</strong>
                    </article>
                    <article>
                      <span>Secondary metric</span>
                      <strong>{card.secondaryMetric}</strong>
                    </article>
                  </div>
                  <div className="report-card-footer">
                    <Link to={card.route}>Open source screen</Link>
                    <Button
                      type="button"
                      variant="secondary"
                      disabled
                      title="Dedicated report export endpoint is not implemented"
                    >
                      Export not available
                    </Button>
                  </div>
                </article>
              ))}
            </section>
          ) : (
            <EmptyState title="No reports in this section">
              No report cards are configured for this section yet.
            </EmptyState>
          )}
        </>
      ) : null}
    </>
  )
}
