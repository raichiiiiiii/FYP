import { useCallback, useEffect, useMemo, useState } from 'react'

import { PageHeader } from '../../../layouts/PageHeader'
import { AccessDenied } from '../../../shared/components/AccessDenied'
import { EmptyState } from '../../../shared/components/EmptyState'
import { ErrorState } from '../../../shared/components/ErrorState'
import { LoadingState } from '../../../shared/components/LoadingState'
import type { AppRoleCode, AppSession, LoadState } from '../../../shared/types'
import { formatCurrency, formatDate } from '../../../shared/utils/formatting'
import { useApplications } from '../api/useApplications'
import {
  applicationWorkspaceRoute,
  buildApplicationMetrics,
  canCreateApplication,
  canViewApplicationPipeline,
  filterApplications,
  sortApplications,
  summarizeApplications,
} from './applications.model'
import { ApplicationFilters } from './ApplicationFilters'
import { ApplicationStatusBadge } from './ApplicationStatusBadge'
import type {
  ApplicationFiltersState,
  ApplicationRawDto,
  ApplicationSortKey,
} from './applications.types'

const defaultFilters: ApplicationFiltersState = {
  search: '',
  status: 'all',
  roleQueue: 'all',
  riskRating: 'all',
}

export function ApplicationsPage({
  session,
  navigate,
  roleCodes,
}: {
  session: AppSession
  navigate: (path: string) => void
  roleCodes: AppRoleCode[]
}) {
  const { listApplications, submitApplication } = useApplications(session)
  const [state, setState] = useState<LoadState<ApplicationRawDto[]>>({
    status: 'loading',
  })
  const [filters, setFilters] = useState<ApplicationFiltersState>(defaultFilters)
  const [sortKey, setSortKey] = useState<ApplicationSortKey>('status')
  const [message, setMessage] = useState<string | null>(null)
  const [submittingApplicationId, setSubmittingApplicationId] = useState<
    string | null
  >(null)

  const canView = canViewApplicationPipeline(roleCodes)
  const showCreateAction = canCreateApplication(roleCodes)

  const loadApplications = useCallback(
    () => listApplications<ApplicationRawDto>(),
    [listApplications],
  )

  const refresh = useCallback(async () => {
    setState({ status: 'loading' })

    try {
      setState({ status: 'ready', data: await loadApplications() })
    } catch (error) {
      setState({
        status: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Unable to load applications',
      })
    }
  }, [loadApplications])

  async function submitApplicationRecord(applicationId: string) {
    setMessage(null)
    setSubmittingApplicationId(applicationId)

    try {
      await submitApplication(applicationId, {
        actorUserId: session.actorUserId || undefined,
      })
      await refresh()
      setMessage('Application submitted')
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Unable to submit application',
      )
    } finally {
      setSubmittingApplicationId(null)
    }
  }

  useEffect(() => {
    let cancelled = false

    loadApplications()
      .then((applications) => {
        if (!cancelled) {
          setState({ status: 'ready', data: applications })
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({
            status: 'error',
            message:
              error instanceof Error
                ? error.message
                : 'Unable to load applications',
          })
        }
      })

    return () => {
      cancelled = true
    }
  }, [loadApplications])

  const applications = useMemo(
    () =>
      state.status === 'ready'
        ? summarizeApplications(state.data)
        : [],
    [state],
  )
  const filteredApplications = useMemo(
    () => sortApplications(filterApplications(applications, filters), sortKey),
    [applications, filters, sortKey],
  )
  const metrics = useMemo(
    () => buildApplicationMetrics(applications),
    [applications],
  )

  if (!canView) {
    return <AccessDenied />
  }

  return (
    <>
      <PageHeader
        eyebrow="Mudarabah finance"
        title="Application pipeline"
        action={
          showCreateAction ? (
            <button
              type="button"
              onClick={() => navigate('/finance/opportunities')}
            >
              Create from opportunity
            </button>
          ) : null
        }
      />
      <p className="notice">
        Applications are shown as review pipeline records. Full workspace
        decisions stay inside each application workspace.
      </p>

      {state.status === 'loading' ? (
        <LoadingState message="Loading applications..." />
      ) : null}

      {state.status === 'error' ? (
        <ErrorState
          title="Unable to load application pipeline"
          message={state.message}
        />
      ) : null}
      {message ? <p className="notice">{message}</p> : null}

      {state.status === 'ready' ? (
        <>
          <section className="finance-metric-grid" aria-label="Application summary">
            {metrics.map((metric) => (
              <article
                className={`finance-metric-card finance-metric-card--${metric.tone}`}
                key={metric.label}
              >
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
                <small>API-backed list summary</small>
              </article>
            ))}
          </section>

          <section className="finance-guidance-panel finance-guidance-panel--compact">
            <span className="eyebrow">Review pipeline</span>
            <h2>Gate visibility, not list-based approval</h2>
            <p>
              This view shows evidence, financier, Shariah, contract, and
              closure readiness. Mutations remain inside the application
              workspace where backend guards create audit events.
            </p>
          </section>

          <ApplicationFilters filters={filters} onChange={setFilters} />

          <div className="applications-sort-row">
            <label className="field">
              <span>Sort</span>
              <select
                value={sortKey}
                onChange={(event) =>
                  setSortKey(event.target.value as ApplicationSortKey)
                }
              >
                <option value="status">Lifecycle status</option>
                <option value="dueAt">Due date</option>
                <option value="capital">Requested capital</option>
              </select>
            </label>
            <button
              type="button"
              className="button button--secondary"
              onClick={() => void refresh()}
            >
              Refresh
            </button>
          </div>

          {applications.length === 0 ? (
            <EmptyState
              title="No applications yet"
              action={
                showCreateAction ? (
                  <button
                    type="button"
                    onClick={() => navigate('/finance/opportunities')}
                  >
                    Create from opportunity
                  </button>
                ) : null
              }
            >
              Create a procurement opportunity first, then start the capital
              application from that evidence-backed record.
            </EmptyState>
          ) : filteredApplications.length === 0 ? (
            <EmptyState title="No applications match these filters">
              Adjust the status, queue, risk, or search filters to widen the
              pipeline view.
            </EmptyState>
          ) : (
            <section className="applications-table" aria-label="Applications">
              {filteredApplications.map((application) => (
                <article className="application-pipeline-card" key={application.id}>
                  <div className="applications-record-main">
                    <div className="application-pipeline-title">
                      <strong>{application.opportunityTitle}</strong>
                      <ApplicationStatusBadge status={application.status} />
                    </div>
                    <span>
                      {application.applicantName ?? 'No applicant assigned'} -
                      {application.id}
                    </span>
                    <small>Backend status: {application.rawStatus}</small>
                  </div>

                  <div className="application-pipeline-money">
                    <strong>
                      {formatCurrency(
                        application.requestedCapital,
                        application.currency,
                      )}
                    </strong>
                    <span>Requested capital</span>
                  </div>

                  <div className="application-readiness">
                    <div className="finance-readiness-bar">
                      <span style={{ width: `${application.readinessPercent}%` }} />
                    </div>
                    <strong>{application.readinessPercent}% ready</strong>
                    <span>{application.evidenceGapCount} evidence gaps</span>
                  </div>

                  <div className="application-gate-list" aria-label="Review gates">
                    {application.gateSummary.map((gate) => (
                      <span
                        className={`application-gate application-gate--${gate.state}`}
                        key={gate.key}
                      >
                        {gate.label}
                      </span>
                    ))}
                  </div>

                  <div className="application-review-meta">
                    <div>
                      <strong>{application.nextReviewer}</strong>
                      <span>Next reviewer</span>
                    </div>
                    <div>
                      <strong>{application.riskRating}</strong>
                      <span>Risk</span>
                    </div>
                    <div>
                      <strong>{formatDate(application.dueAt)}</strong>
                      <span>Due date</span>
                    </div>
                  </div>

                  {application.blockedReason ? (
                    <p className="application-blocked-note">
                      {application.blockedReason}
                    </p>
                  ) : null}

                  <div className="application-pipeline-actions">
                    {application.status === 'draft' && showCreateAction ? (
                      <button
                        type="button"
                        disabled={submittingApplicationId === application.id}
                        onClick={() =>
                          void submitApplicationRecord(application.id)
                        }
                      >
                        Submit
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() =>
                        navigate(applicationWorkspaceRoute(application.id))
                      }
                    >
                      Open workspace
                    </button>
                  </div>
                </article>
              ))}
            </section>
          )}
        </>
      ) : null}
    </>
  )
}
