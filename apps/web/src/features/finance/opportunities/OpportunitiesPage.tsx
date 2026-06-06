import { useCallback, useEffect, useMemo, useState } from 'react'

import { PageHeader } from '../../../layouts/PageHeader'
import { AccessDenied } from '../../../shared/components/AccessDenied'
import { EmptyState } from '../../../shared/components/EmptyState'
import { ErrorState } from '../../../shared/components/ErrorState'
import { LoadingState } from '../../../shared/components/LoadingState'
import { StatusBadge } from '../../../shared/components/StatusBadge'
import type {
  AppRoleCode,
  AppSession,
  FinanceSummary,
  LoadState,
} from '../../../shared/types'
import { formatCurrency } from '../../../shared/utils/formatting'
import { useEvidencePacks } from '../../evidence/api/useEvidencePacks'
import { useProjects } from '../../procurement/api/useProjects'
import { usePurchaseOrders } from '../../procurement/api/usePurchaseOrders'
import { useApplications } from '../api/useApplications'
import { useFinanceSummary } from '../api/useFinanceSummary'
import { useOpportunities } from '../api/useOpportunities'
import { findSummaryMetric } from '../../summary/summary.model'
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
  buildOpportunityMetrics,
  buildDraftApplicationPayload,
  buildOpportunityCreatePayload,
  canCreateDraftApplication,
  canCreateOpportunity,
  canViewOpportunities,
  mapOpportunities,
  opportunityBlockedReason,
  opportunityProjectedMargin,
  opportunityReadinessPercent,
  opportunitySourceLabels,
} from './opportunities.validation'

type OpportunityLoadData = {
  summary: FinanceSummary
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
  const { getFinanceSummary } = useFinanceSummary(session, roleCodes)
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
  const opportunityMetrics = useMemo(
    () => buildOpportunityMetrics(opportunities),
    [opportunities],
  )

  const loadData = useCallback(async (): Promise<OpportunityLoadData> => {
    const [summary, projects, purchaseOrders, evidencePacks, opportunityRows] =
      await Promise.all([
        getFinanceSummary(),
        listProjects<ProjectOption>(),
        listPurchaseOrders<PurchaseOrderOption>(),
        listEvidencePacks<EvidencePackOption>(),
        listOpportunities<OpportunityRawDto>(),
      ])

    return {
      summary,
      projects,
      purchaseOrders,
      evidencePacks,
      opportunities: opportunityRows,
    }
  }, [
    getFinanceSummary,
    listEvidencePacks,
    listOpportunities,
    listProjects,
    listPurchaseOrders,
  ])

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
      {state.status === 'ready' ? (
        <FinanceSummaryPanel summary={state.data.summary} />
      ) : null}

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
        <div className="finance-opportunity-shell">
          <section className="finance-metric-grid" aria-label="Opportunity summary">
            {opportunityMetrics.map((metric) => (
              <article
                className={`finance-metric-card finance-metric-card--${metric.tone}`}
                key={metric.label}
              >
                <span>{metric.label}</span>
                <strong>
                  {metric.format === 'currency'
                    ? formatCurrency(metric.value)
                    : metric.value}
                </strong>
                <small>{metric.detail}</small>
              </article>
            ))}
          </section>

          <section className="finance-two-column">
            <article className="finance-guidance-panel">
              <span className="eyebrow">Eligibility guard</span>
              <h2>Revenue evidence first</h2>
              <p>
                Mudarabah applications must start from buyer demand that can
                produce separately measurable project revenue. Internal
                consumption remains a procurement record, not a finance
                opportunity.
              </p>
              <div className="finance-rule-list" aria-label="Opportunity rules">
                <span>Buyer PO, contract award, sales order, tender result, or equivalent document</span>
                <span>Expected revenue must exceed expected cost</span>
                <span>Application drafts are blocked once one already exists</span>
              </div>
            </article>

            <CreateOpportunityForm
              projects={state.data.projects}
              purchaseOrders={state.data.purchaseOrders}
              evidencePacks={state.data.evidencePacks}
              canCreate={canCreate}
              isSubmitting={isSubmitting}
              onSubmit={createOpportunity}
            />
          </section>

          <section className="finance-panel">
            <div className="finance-panel-header">
              <div>
                <span className="eyebrow">Pipeline source</span>
                <h2>Opportunity records</h2>
              </div>
              <button
                type="button"
                className="button button--secondary"
                onClick={() => navigate('/finance/applications')}
              >
                View applications
              </button>
            </div>
            {opportunities.length ? (
              <div className="opportunity-list">
                {opportunities.map((opportunity) => {
                  const readiness = opportunityReadinessPercent(opportunity)
                  const blockedReason = opportunityBlockedReason(opportunity)

                  return (
                    <article
                      className={
                        opportunity.isRevenueGenerating
                          ? 'opportunity-card'
                          : 'opportunity-card opportunity-card--blocked'
                      }
                      key={opportunity.id}
                    >
                      <div className="opportunity-card-main">
                        <div className="opportunity-card-title">
                          <strong>{opportunity.title}</strong>
                          <StatusBadge status={opportunity.status.toUpperCase()} />
                        </div>
                        <span>{opportunity.projectName ?? 'No project linked'}</span>
                        <small>
                          {opportunitySourceLabels[opportunity.sourceType]} -{' '}
                          {opportunity.sourceDocumentId}
                        </small>
                      </div>

                      <div className="opportunity-readiness">
                        <div>
                          <strong>{readiness}%</strong>
                          <span>Readiness</span>
                        </div>
                        <div
                          className="finance-readiness-bar"
                          aria-label={`Opportunity readiness ${readiness}%`}
                        >
                          <span style={{ width: `${readiness}%` }} />
                        </div>
                      </div>

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
                            opportunityProjectedMargin(opportunity),
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
                      {blockedReason ? (
                        <p className="error-text">Blocked: {blockedReason}</p>
                      ) : null}
                    </article>
                  )
                })}
              </div>
            ) : (
              <EmptyState title="No finance opportunities yet">
                Create an opportunity from buyer demand evidence before drafting
                a mudarabah application.
              </EmptyState>
            )}
          </section>
        </div>
      ) : null}
    </>
  )
}

function FinanceSummaryPanel({ summary }: { summary: FinanceSummary }) {
  const applicationMetric = findSummaryMetric(
    summary.metrics,
    'finance-applications',
  )
  const evidenceMetric = findSummaryMetric(
    summary.metrics,
    'finance-evidence-gaps',
  )
  const lossMetric = findSummaryMetric(
    summary.metrics,
    'finance-loss-exceptions',
  )

  return (
    <section className="summary-band" aria-label="Finance summary">
      <div className="dashboard-panel-header">
        <div>
          <span className="eyebrow">Backend finance summary</span>
          <h2>Pipeline readiness</h2>
        </div>
      </div>
      <div className="details-grid dashboard-details-grid">
        <SummaryDataCard
          label={applicationMetric?.label ?? 'Applications'}
          value={applicationMetric?.value ?? 0}
          helper={applicationMetric?.helper ?? 'No application summary returned.'}
        />
        <SummaryDataCard
          label={evidenceMetric?.label ?? 'Evidence gaps'}
          value={evidenceMetric?.value ?? 0}
          helper={evidenceMetric?.helper ?? 'No evidence summary returned.'}
        />
        <SummaryDataCard
          label={lossMetric?.label ?? 'Loss exceptions'}
          value={lossMetric?.value ?? 0}
          helper={
            lossMetric?.helper ??
            'Loss exception readiness is unavailable from the summary DTO.'
          }
        />
        <SummaryDataCard
          label="Queue items"
          value={summary.queue.length}
          helper="Backend-owned review and blocker queue entries."
        />
      </div>
      {summary.blockers.length ? (
        <div className="dashboard-signal-list">
          {summary.blockers.map((blocker) => (
            <article
              className={`dashboard-signal dashboard-signal--${blocker.severity}`}
              key={blocker.id}
            >
              <span>{blocker.title}</span>
              <strong>{blocker.count}</strong>
              <p>{blocker.description}</p>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState title="No finance blockers">
          Backend summary did not return evidence, loss exception, or workflow
          blockers for this role.
        </EmptyState>
      )}
    </section>
  )
}

function SummaryDataCard({
  label,
  value,
  helper,
}: {
  label: string
  value: string | number
  helper: string
}) {
  return (
    <article className="data-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{helper}</p>
    </article>
  )
}
