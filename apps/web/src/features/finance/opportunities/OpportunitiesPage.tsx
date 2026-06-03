import { useCallback, useEffect, useMemo, useState } from 'react'

import { PageHeader } from '../../../layouts/PageHeader'
import { AccessDenied } from '../../../shared/components/AccessDenied'
import { EmptyState } from '../../../shared/components/EmptyState'
import { ErrorState } from '../../../shared/components/ErrorState'
import { LoadingState } from '../../../shared/components/LoadingState'
import { StatusBadge } from '../../../shared/components/StatusBadge'
import type { AppRoleCode, AppSession, LoadState } from '../../../shared/types'
import { formatCurrency } from '../../../shared/utils/formatting'
import { useEvidencePacks } from '../../evidence/api/useEvidencePacks'
import { useProjects } from '../../procurement/api/useProjects'
import { usePurchaseOrders } from '../../procurement/api/usePurchaseOrders'
import { useApplications } from '../api/useApplications'
import { useOpportunities } from '../api/useOpportunities'
import { CreateOpportunityForm } from './CreateOpportunityForm'
import type {
  CreateOpportunityFormValues,
  EvidencePackOption,
  OpportunityRawDto,
  ProcurementOpportunity,
  ProjectOption,
  PurchaseOrderOption,
} from './opportunities.types'
import {
  buildDraftApplicationPayload,
  buildOpportunityCreatePayload,
  canCreateDraftApplication,
  canCreateOpportunity,
  canViewOpportunities,
  mapOpportunities,
  opportunitySourceLabels,
} from './opportunities.validation'

type OpportunityLoadData = {
  projects: ProjectOption[]
  purchaseOrders: PurchaseOrderOption[]
  evidencePacks: EvidencePackOption[]
  opportunities: OpportunityRawDto[]
}

export function OpportunitiesPage({
  session,
  navigate,
  roleCodes,
}: {
  session: AppSession
  navigate: (path: string) => void
  roleCodes: AppRoleCode[]
}) {
  const { listProjects } = useProjects(session)
  const { listPurchaseOrders } = usePurchaseOrders(session)
  const { listEvidencePacks } = useEvidencePacks(session)
  const { listOpportunities, createOpportunity: createOpportunityRecord } =
    useOpportunities(session)
  const { createApplication } = useApplications(session)
  const [state, setState] = useState<LoadState<OpportunityLoadData>>({
    status: 'loading',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const canCreate = canCreateOpportunity(roleCodes)
  const canView = canViewOpportunities(roleCodes)
  const opportunities = useMemo(
    () =>
      state.status === 'ready'
        ? mapOpportunities(state.data.opportunities)
        : [],
    [state],
  )

  const loadData = useCallback(async (): Promise<OpportunityLoadData> => {
    const [projects, purchaseOrders, evidencePacks, opportunityRows] =
      await Promise.all([
        listProjects<ProjectOption>(),
        listPurchaseOrders<PurchaseOrderOption>(),
        listEvidencePacks<EvidencePackOption>(),
        listOpportunities<OpportunityRawDto>(),
      ])

    return {
      projects,
      purchaseOrders,
      evidencePacks,
      opportunities: opportunityRows,
    }
  }, [listEvidencePacks, listOpportunities, listProjects, listPurchaseOrders])

  const refresh = useCallback(async () => {
    setState({ status: 'loading' })

    try {
      setState({ status: 'ready', data: await loadData() })
    } catch (error) {
      setState({
        status: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Unable to load finance opportunities',
      })
    }
  }, [loadData])

  useEffect(() => {
    let cancelled = false

    loadData()
      .then((data) => {
        if (!cancelled) {
          setState({ status: 'ready', data })
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({
            status: 'error',
            message:
              error instanceof Error
                ? error.message
                : 'Unable to load finance opportunities',
          })
        }
      })

    return () => {
      cancelled = true
    }
  }, [loadData])

  async function createOpportunity(values: CreateOpportunityFormValues) {
    if (!session.organizationId) {
      setMessage('Create an organization first.')
      return
    }

    setIsSubmitting(true)
    setMessage(null)

    try {
      await createOpportunityRecord<OpportunityRawDto>(
        buildOpportunityCreatePayload(
          values,
          session.organizationId,
          session.actorUserId,
        ),
      )
      await refresh()
      setMessage('Eligible opportunity created.')
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Unable to create opportunity',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  async function createApplicationDraft(opportunity: ProcurementOpportunity) {
    if (!session.organizationId) {
      setMessage('Create an organization first.')
      return
    }

    setIsSubmitting(true)
    setMessage(null)

    try {
      const application = await createApplication<{ id: string }>(
        buildDraftApplicationPayload(
          opportunity,
          session.organizationId,
          session.actorUserId,
        ),
      )
      navigate(`/finance/applications/${application.id}`)
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Unable to create application draft',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!canView) {
    return <AccessDenied />
  }

  return (
    <>
      <PageHeader
        eyebrow="Mudarabah finance"
        title="Finance opportunities"
        action={
          <button type="button" onClick={() => navigate('/finance/applications')}>
            Applications
          </button>
        }
      />
      <p className="notice">
        Only revenue-generating procurement opportunities with buyer demand or
        equivalent evidence can enter the mudarabah application flow.
      </p>

      {state.status === 'loading' ? (
        <LoadingState message="Loading finance opportunities..." />
      ) : null}
      {state.status === 'error' ? (
        <ErrorState
          title="Unable to load finance opportunities"
          message={state.message}
        />
      ) : null}
      {message ? <p className="notice">{message}</p> : null}

      {state.status === 'ready' ? (
        <>
          <CreateOpportunityForm
            projects={state.data.projects}
            purchaseOrders={state.data.purchaseOrders}
            evidencePacks={state.data.evidencePacks}
            canCreate={canCreate}
            isSubmitting={isSubmitting}
            onSubmit={createOpportunity}
          />

          <section className="table-section">
            <h2>Opportunity records</h2>
            {opportunities.length ? (
              <div className="opportunity-list">
                {opportunities.map((opportunity) => (
                  <article
                    className={
                      opportunity.isRevenueGenerating
                        ? 'opportunity-card'
                        : 'opportunity-card opportunity-card--blocked'
                    }
                    key={opportunity.id}
                  >
                    <div>
                      <strong>{opportunity.title}</strong>
                      <span>{opportunity.projectName ?? 'No project'}</span>
                      <small>
                        {opportunitySourceLabels[opportunity.sourceType]} -{' '}
                        {opportunity.sourceDocumentId}
                      </small>
                    </div>
                    <StatusBadge status={opportunity.status.toUpperCase()} />
                    <div>
                      <strong>
                        {formatCurrency(
                          opportunity.requestedCapitalAmount,
                          opportunity.currency,
                        )}
                      </strong>
                      <span>Requested capital</span>
                    </div>
                    <div>
                      <strong>{opportunity.buyerName}</strong>
                      <span>Buyer</span>
                    </div>
                    <div>
                      <strong>
                        {formatCurrency(
                          opportunity.expectedRevenueAmount -
                            opportunity.expectedCostAmount,
                          opportunity.currency,
                        )}
                      </strong>
                      <span>Projected margin</span>
                    </div>
                    <div className="inline-actions">
                      <button
                        type="button"
                        disabled={
                          !canCreateDraftApplication(opportunity) ||
                          isSubmitting
                        }
                        onClick={() => void createApplicationDraft(opportunity)}
                      >
                        Create draft application
                      </button>
                    </div>
                    {!opportunity.isRevenueGenerating ? (
                      <p className="error-text">
                        Blocked: routine internal consumption cannot proceed to
                        mudarabah financing.
                      </p>
                    ) : null}
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState title="No finance opportunities yet">
                Create an opportunity from buyer demand evidence before drafting
                a mudarabah application.
              </EmptyState>
            )}
          </section>
        </>
      ) : null}
    </>
  )
}
