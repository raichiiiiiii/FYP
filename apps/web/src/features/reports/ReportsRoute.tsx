import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { PageHeader } from '../../layouts/PageHeader'
import { apiRequest } from '../../shared/api/client'
import { endpoints } from '../../shared/api/endpoints'
import { getErrorMessage } from '../../shared/api/errors'
import { httpClient } from '../../shared/api/http-client'
import { Button } from '../../shared/components/Button'
import { EmptyState } from '../../shared/components/EmptyState'
import { ErrorState } from '../../shared/components/ErrorState'
import { LoadingState } from '../../shared/components/LoadingState'
import { StatusBadge } from '../../shared/components/StatusBadge'
import type { AppSession, LoadState } from '../../shared/types'
import { formatDateTime } from '../../shared/utils/formatting'
import {
  buildReportCards,
  reportStatusLabel,
  summarizeReports,
  type AuditReportDto,
  type FinanceReportDto,
  type IntegrationReportDto,
  type ProcurementReportDto,
  type ReportCard,
  type ReportCategory,
  type ReportsSummaryDto,
  type ReportsViewData,
} from './reports.model'

type ReportsPayload = {
  data: ReportsViewData
  warnings: string[]
  loadedAt: string
}

type ExportState =
  | { status: 'idle' }
  | { status: 'working'; reportType: ReportCategory }
  | { status: 'success'; message: string }
  | { status: 'error'; message: string }

type ReportExportJob = {
  id: string
  reportType: ReportCategory
  format: 'json'
  status: string
}

const reportTabs: Array<{ id: ReportCategory; label: string }> = [
  { id: 'procurement', label: 'Procurement' },
  { id: 'finance', label: 'Finance' },
  { id: 'audit', label: 'Audit' },
  { id: 'integrations', label: 'Integrations' },
]

export function ReportsRoute({ session }: { session: AppSession }) {
  const [activeCategory, setActiveCategory] =
    useState<ReportCategory>('procurement')
  const [state, setState] = useState<LoadState<ReportsPayload>>({
    status: 'loading',
  })
  const [exportState, setExportState] = useState<ExportState>({
    status: 'idle',
  })

  const loadReports = useCallback(async (): Promise<ReportsPayload> => {
    if (!session.organizationId || !session.actorUserId) {
      throw new Error('Active organization and user context are required')
    }

    const organizationId = session.organizationId
    const actorUserId = session.actorUserId
    const summary = await apiRequest<ReportsSummaryDto>(
      endpoints.reports.summary(organizationId, actorUserId),
    )
    const detailRequests = reportTabs.map((tab) => ({
      category: tab.id,
      path: reportEndpoint(tab.id, organizationId, actorUserId),
    }))
    const detailResults = await Promise.allSettled(
      detailRequests.map((request) => apiRequest<unknown>(request.path)),
    )
    const reports: ReportsViewData['reports'] = {}
    const warnings: string[] = []

    detailResults.forEach((result, index) => {
      const request = detailRequests[index]

      if (result.status === 'fulfilled') {
        assignReport(reports, request.category, result.value)
        return
      }

      warnings.push(
        `${labelFor(request.category)}: ${getErrorMessage(
          result.reason,
          'Unable to load report DTO',
        )}`,
      )
    })

    return {
      data: {
        summary,
        reports,
      },
      warnings,
      loadedAt: new Date().toISOString(),
    }
  }, [session.actorUserId, session.organizationId])

  const refreshReports = useCallback(() => {
    setState({ status: 'loading' })
    setExportState({ status: 'idle' })

    loadReports()
      .then((payload) => {
        setState({ status: 'ready', data: payload })
      })
      .catch((error: unknown) => {
        setState({
          status: 'error',
          message: getErrorMessage(error, 'Unable to load reports'),
        })
      })
  }, [loadReports])

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

  async function exportReport(card: ReportCard) {
    if (card.exportStatus !== 'available') {
      setExportState({
        status: 'error',
        message: `${card.title} is restricted for this role.`,
      })
      return
    }

    if (!session.organizationId || !session.actorUserId) {
      setExportState({
        status: 'error',
        message: 'Active organization and user context are required.',
      })
      return
    }

    setExportState({ status: 'working', reportType: card.id })

    try {
      const exportJob = await apiRequest<ReportExportJob>(
        endpoints.reports.exports,
        {
          method: 'POST',
          body: {
            organizationId: session.organizationId,
            actorUserId: session.actorUserId,
            reportType: card.id,
            format: 'json',
          },
        },
      )
      const result = await httpClient.blob(
        endpoints.reports.exportDownload(
          exportJob.id,
          session.organizationId,
          session.actorUserId,
        ),
      )

      downloadBlob(result.blob, reportExportFileName(result.fileName, exportJob))
      setExportState({
        status: 'success',
        message: `${card.title} JSON export downloaded.`,
      })
    } catch (error: unknown) {
      setExportState({
        status: 'error',
        message: getErrorMessage(error, 'Unable to export report'),
      })
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Reports"
        title="Reports and review packs"
        action={
          <Button type="button" variant="secondary" onClick={refreshReports}>
            Refresh reports
          </Button>
        }
      />

      <section className="reports-hero" aria-label="Reports implementation status">
        <div>
          <span>Backend-owned report catalogue</span>
          <h2>Review aggregate DTOs and export audited JSON artifacts.</h2>
          <p>
            This page uses the Reports API as the source of truth for summary,
            procurement, finance, audit, and integration counts. JSON exports
            are generated by the backend and downloaded from object storage.
          </p>
        </div>
        <div className="reports-hero-status">
          <strong>JSON export supported</strong>
          <p>
            PDF and spreadsheet exports are not implemented yet. Role-restricted
            reports stay unavailable to unauthorized users.
          </p>
        </div>
      </section>

      {state.status === 'loading' ? (
        <LoadingState message="Loading report DTOs..." />
      ) : null}
      {state.status === 'error' ? (
        <ErrorState title="Unable to load reports" message={state.message} />
      ) : null}

      {exportState.status === 'success' ? (
        <section className="reports-hero-status" role="status">
          <strong>{exportState.message}</strong>
        </section>
      ) : null}
      {exportState.status === 'error' ? (
        <ErrorState title="Report export failed" message={exportState.message} />
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
              <span>Audit records</span>
              <strong>{summary.auditRecords}</strong>
            </article>
            <article>
              <span>Integration records</span>
              <strong>{summary.integrationRecords}</strong>
            </article>
            <article>
              <span>JSON exports</span>
              <strong>{summary.jsonExportsAvailable}</strong>
            </article>
            <article>
              <span>Restricted reports</span>
              <strong>{summary.restrictedReports}</strong>
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
              {visibleCards.map((card) => {
                const isExporting =
                  exportState.status === 'working' &&
                  exportState.reportType === card.id
                const exportDisabled =
                  isExporting || card.exportStatus !== 'available'

                return (
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
                        disabled={exportDisabled}
                        title={
                          card.exportStatus === 'available'
                            ? 'Generate and download JSON export'
                            : 'Report restricted for this role'
                        }
                        onClick={() => void exportReport(card)}
                      >
                        {isExporting
                          ? 'Preparing...'
                          : card.exportStatus === 'available'
                            ? 'Download JSON'
                            : 'Restricted'}
                      </Button>
                    </div>
                  </article>
                )
              })}
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

function reportEndpoint(
  category: ReportCategory,
  organizationId: string,
  actorUserId: string,
) {
  switch (category) {
    case 'procurement':
      return endpoints.reports.procurement(organizationId, actorUserId)
    case 'finance':
      return endpoints.reports.finance(organizationId, actorUserId)
    case 'audit':
      return endpoints.reports.audit(organizationId, actorUserId)
    case 'integrations':
      return endpoints.reports.integrations(organizationId, actorUserId)
  }
}

function assignReport(
  reports: ReportsViewData['reports'],
  category: ReportCategory,
  value: unknown,
) {
  switch (category) {
    case 'procurement':
      reports.procurement = value as ProcurementReportDto
      break
    case 'finance':
      reports.finance = value as FinanceReportDto
      break
    case 'audit':
      reports.audit = value as AuditReportDto
      break
    case 'integrations':
      reports.integrations = value as IntegrationReportDto
      break
  }
}

function labelFor(category: ReportCategory) {
  return reportTabs.find((tab) => tab.id === category)?.label ?? category
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.click()
  URL.revokeObjectURL(url)
}

function reportExportFileName(fileName: string, exportJob: ReportExportJob) {
  return fileName === 'download'
    ? `${exportJob.reportType}-report-${exportJob.id}.json`
    : fileName
}
