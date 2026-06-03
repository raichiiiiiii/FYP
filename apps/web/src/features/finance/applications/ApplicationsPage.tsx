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
  const { listApplications } = useApplications(session)
  const [state, setState] = useState<LoadState<ApplicationRawDto[]>>({
    status: 'loading',
  })
  const [filters, setFilters] = useState<ApplicationFiltersState>(defaultFilters)
  const [sortKey, setSortKey] = useState<ApplicationSortKey>('status')

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

      {state.status === 'ready' ? (
        <>
          <section className="applications-summary">
            {metrics.map((metric) => (
              <article
                className={`applications-summary-card applications-summary-card--${metric.tone}`}
                key={metric.label}
              >
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
              </article>
            ))}
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
                <article key={application.id}>
                  <div className="applications-record-main">
                    <strong>{application.opportunityTitle}</strong>
                    <span>{application.applicantName ?? 'No applicant assigned'}</span>
                    <small>{application.id}</small>
                  </div>
                  <ApplicationStatusBadge status={application.status} />
                  <div>
                    <strong>
                      {formatCurrency(
                        application.requestedCapital,
                        application.currency,
                      )}
                    </strong>
                    <span>Requested capital</span>
                  </div>
                  <div>
                    <strong>{application.nextReviewer}</strong>
                    <span>Next reviewer</span>
                  </div>
                  <div>
                    <strong>{application.evidenceGapCount}</strong>
                    <span>Evidence gaps</span>
                  </div>
                  <div>
                    <strong>{application.riskRating}</strong>
                    <span>Risk</span>
                  </div>
                  <div>
                    <strong>{formatDate(application.dueAt)}</strong>
                    <span>Due date</span>
                  </div>
                  <div className="inline-actions">
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
