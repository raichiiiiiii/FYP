import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { useAppSession } from '../../app/session'
import { PageHeader } from '../../layouts/PageHeader'
import { apiBaseUrl, apiRequest } from '../../shared/api/client'
import { getErrorMessage } from '../../shared/api/errors'
import { DataCard } from '../../shared/components/DataCard'
import { EmptyState } from '../../shared/components/EmptyState'
import { ErrorState } from '../../shared/components/ErrorState'
import { LoadingState } from '../../shared/components/LoadingState'
import { StatusPill } from '../../shared/components/StatusPill'
import type { HealthResponse, LoadState, Organization } from '../../shared/types'
import { formatDateTime } from '../../shared/utils/formatting'
import { DashboardKpiGrid } from './DashboardKpiGrid'
import { SmartTaskInbox } from './SmartTaskInbox'
import {
  countTasksByPriority,
  getActionableTasks,
  getDashboardContent,
} from './dashboard.model'

export function Dashboard() {
  const { authorization, session } = useAppSession()
  const [healthState, setHealthState] = useState<LoadState<HealthResponse>>({
    status: 'loading',
  })
  const [organizationState, setOrganizationState] =
    useState<LoadState<Organization> | null>(null)

  const dashboardContent = useMemo(
    () =>
      authorization.status === 'ready'
        ? getDashboardContent(authorization.roleCodes)
        : null,
    [authorization],
  )
  const healthUrl = useMemo(() => `${apiBaseUrl}/health`, [])

  const requestHealth = useCallback(
    () => apiRequest<HealthResponse>('/health'),
    [],
  )

  const requestOrganization = useCallback(() => {
    if (!session.organizationId) {
      return Promise.resolve(null)
    }

    return apiRequest<Organization>(`/orgs/${session.organizationId}`)
  }, [session.organizationId])

  async function refreshHealth() {
    setHealthState({ status: 'loading' })

    try {
      setHealthState({ status: 'ready', data: await requestHealth() })
    } catch (error) {
      setHealthState({
        status: 'error',
        message: getErrorMessage(error, 'Unable to reach the MEPN API'),
      })
    }
  }

  useEffect(() => {
    let cancelled = false

    requestHealth()
      .then((data) => {
        if (!cancelled) {
          setHealthState({ status: 'ready', data })
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setHealthState({
            status: 'error',
            message: getErrorMessage(error, 'Unable to reach the MEPN API'),
          })
        }
      })

    return () => {
      cancelled = true
    }
  }, [requestHealth])

  useEffect(() => {
    let cancelled = false

    if (!session.organizationId) {
      return () => {
        cancelled = true
      }
    }

    requestOrganization()
      .then((data) => {
        if (!cancelled && data) {
          setOrganizationState({ status: 'ready', data })
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setOrganizationState({
            status: 'error',
            message: getErrorMessage(error, 'Unable to load organization'),
          })
        }
      })

    return () => {
      cancelled = true
    }
  }, [requestOrganization, session.organizationId])

  if (!dashboardContent) {
    return <LoadingState message="Preparing role-aware dashboard..." />
  }

  const health = healthState.status === 'ready' ? healthState.data : null
  const organization =
    organizationState?.status === 'ready' &&
    organizationState.data.id === session.organizationId
      ? organizationState.data
      : null
  const organizationError =
    organizationState?.status === 'error' ? organizationState : null
  const isOrganizationLoading =
    Boolean(session.organizationId) && !organization && !organizationError
  const actionableTasks = getActionableTasks(dashboardContent.tasks)
  const criticalTaskCount = countTasksByPriority(actionableTasks, 'critical')
  const highTaskCount = countTasksByPriority(actionableTasks, 'high')

  return (
    <>
      <PageHeader
        eyebrow="MEPN role cockpit"
        title={dashboardContent.title}
        action={
          <button type="button" onClick={() => void refreshHealth()}>
            Refresh health
          </button>
        }
      />

      <section className="dashboard-intro">
        <div>
          <p>{dashboardContent.subtitle}</p>
          <strong>
            {criticalTaskCount} critical / {highTaskCount} high-priority tasks
          </strong>
        </div>
        <div>
          <span>Organization</span>
          <strong>{organization?.legalName ?? 'Loading organization...'}</strong>
        </div>
      </section>

      <section className="summary-band" aria-live="polite">
        {healthState.status === 'loading' ? (
          <LoadingState message="Checking API, PostgreSQL, and Redis..." />
        ) : null}
        {healthState.status === 'error' ? (
          <ErrorState message={healthState.message} />
        ) : null}
        {health ? (
          <>
            <StatusPill label="MEPN API" status={health.status} />
            <StatusPill label="PostgreSQL" status={health.database} />
            <StatusPill label="Redis" status={health.redis} />
          </>
        ) : null}
      </section>

      <DashboardKpiGrid kpis={dashboardContent.kpis} />

      <section className="dashboard-panels">
        <article className="dashboard-panel dashboard-panel--wide">
          <div className="dashboard-panel-header">
            <div>
              <span className="eyebrow">Smart task inbox</span>
              <h2>What should happen next</h2>
            </div>
            <Link to="/audit/search">Review audit context</Link>
          </div>
          <SmartTaskInbox tasks={actionableTasks} />
        </article>

        <article className="dashboard-panel">
          <div className="dashboard-panel-header">
            <div>
              <span className="eyebrow">Audit / outbox / Fabric</span>
              <h2>Operational visibility</h2>
            </div>
          </div>
          {dashboardContent.signals.length ? (
            <div className="dashboard-signal-list">
              {dashboardContent.signals.map((signal) => (
                <Link
                  key={signal.id}
                  to={signal.targetRoute}
                  className={`dashboard-signal dashboard-signal--${signal.severity}`}
                >
                  <span>{signal.label}</span>
                  <strong>{signal.value}</strong>
                  <p>{signal.description}</p>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState title="No integration visibility yet">
              This role has no integration or audit queue visible in the current
              dashboard fixture.
            </EmptyState>
          )}
        </article>
      </section>

      <section className="dashboard-panels">
        <article className="dashboard-panel">
          <div className="dashboard-panel-header">
            <div>
              <span className="eyebrow">Node details</span>
              <h2>Current environment</h2>
            </div>
          </div>
          <div className="details-grid dashboard-details-grid">
            <DataCard label="Deployment mode">
              {organization?.deploymentMode ?? 'Pending'}
            </DataCard>
            <DataCard label="Admin memberships">
              {organization?.memberships?.length ?? 0}
            </DataCard>
            <DataCard label="Workspaces">
              {organization?.workspaces?.length ?? 0}
            </DataCard>
            <DataCard label="Environment">
              {health?.environment ?? import.meta.env.MODE}
            </DataCard>
            <DataCard label="API endpoint" wide>
              {healthUrl}
            </DataCard>
            <DataCard label="Backend timestamp" wide>
              {health?.timestamp ? formatDateTime(health.timestamp) : 'Pending'}
            </DataCard>
          </div>
          {organizationError ? (
            <ErrorState message={organizationError.message} />
          ) : null}
          {isOrganizationLoading ? (
            <LoadingState message="Loading organization context..." />
          ) : null}
        </article>

        <article className="dashboard-panel">
          <div className="dashboard-panel-header">
            <div>
              <span className="eyebrow">Recent activity</span>
              <h2>Review trail</h2>
            </div>
            <Link to="/audit/search">Open audit</Link>
          </div>
          {dashboardContent.activities.length ? (
            <div className="dashboard-activity-list">
              {dashboardContent.activities.map((activity) => (
                <Link
                  key={activity.id}
                  to={activity.targetRoute}
                  className="dashboard-activity"
                >
                  <span>{activity.eventType}</span>
                  <strong>{activity.title}</strong>
                  <p>{activity.description}</p>
                  <small>{formatDateTime(activity.occurredAt)}</small>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState title="No scoped activity">
              No role-scoped audit activity is visible in the current fixture.
            </EmptyState>
          )}
        </article>
      </section>
    </>
  )
}
