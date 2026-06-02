import { useCallback, useEffect, useMemo, useState } from 'react'

import { PageHeader } from '../../layouts/PageHeader'
import { apiBaseUrl, apiRequest } from '../../shared/api/client'
import { getErrorMessage } from '../../shared/api/errors'
import { DataCard } from '../../shared/components/DataCard'
import { ErrorState } from '../../shared/components/ErrorState'
import { StatusPill } from '../../shared/components/StatusPill'
import type { HealthResponse, LoadState, Organization } from '../../shared/types'
import { useAppSession } from '../../app/session'

export function Dashboard() {
  const { session } = useAppSession()
  const [healthState, setHealthState] = useState<LoadState<HealthResponse>>({
    status: 'loading',
  })
  const [organizationState, setOrganizationState] =
    useState<LoadState<Organization> | null>(
      session.organizationId ? { status: 'loading' } : null,
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

  const health = healthState.status === 'ready' ? healthState.data : null
  const organization =
    organizationState?.status === 'ready' ? organizationState.data : null

  return (
    <>
      <PageHeader
        eyebrow="MEPN local node"
        title="System health dashboard"
        action={
          <button type="button" onClick={() => void refreshHealth()}>
            Refresh
          </button>
        }
      />

      <section className="summary-band" aria-live="polite">
        {healthState.status === 'loading' ? (
          <p>Checking backend, PostgreSQL, and Redis...</p>
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

      <section className="details-grid">
        <DataCard label="Organization">
          {organization?.legalName ?? 'Not configured'}
        </DataCard>
        <DataCard label="Deployment mode">
          {organization?.deploymentMode ?? 'Pending'}
        </DataCard>
        <DataCard label="Admin memberships">
          {organization?.memberships?.length ?? 0}
        </DataCard>
        <DataCard label="Workspaces">
          {organization?.workspaces?.length ?? 0}
        </DataCard>
        <DataCard label="Service">{health?.service ?? 'Pending'}</DataCard>
        <DataCard label="Database status">
          {health?.database ?? 'Pending'}
        </DataCard>
        <DataCard label="Redis status">{health?.redis ?? 'Pending'}</DataCard>
        <DataCard label="Current environment">
          {health?.environment ?? import.meta.env.MODE}
        </DataCard>
        <DataCard label="API endpoint" wide>
          {healthUrl}
        </DataCard>
        <DataCard label="Last backend timestamp" wide>
          {health?.timestamp ?? 'Pending'}
        </DataCard>
      </section>
    </>
  )
}
