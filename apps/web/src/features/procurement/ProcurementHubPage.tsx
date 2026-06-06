import { useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'

import { PageHeader } from '../../layouts/PageHeader'
import { EmptyState } from '../../shared/components/EmptyState'
import { ErrorState } from '../../shared/components/ErrorState'
import { LoadingState } from '../../shared/components/LoadingState'
import { StatusBadge } from '../../shared/components/StatusBadge'
import type {
  AppRoleCode,
  AppSession,
  LoadState,
  ProcurementSummary,
} from '../../shared/types'
import { formatCurrency } from '../../shared/utils/formatting'
import {
  findSummaryMetric,
  summaryToneForSeverity,
} from '../summary/summary.model'
import { useProcurementSummary } from './api/useProcurementSummary'
import { useProjects } from './api/useProjects'
import { usePurchaseOrders } from './api/usePurchaseOrders'
import { useRequisitions } from './api/useRequisitions'
import { useSuppliers } from './api/useSuppliers'
import type {
  HubPurchaseOrder,
  HubRequisition,
  HubSupplier,
} from './procurementHub.model'
import { toHubNumber } from './procurementHub.model'

type HubProject = {
  id: string
  name: string
  code?: string | null
  status: string
  budget?: number | string | null
}

type ProcurementHubData = {
  summary: ProcurementSummary
  projects: HubProject[]
  suppliers: HubSupplier[]
  requisitions: HubRequisition[]
  purchaseOrders: HubPurchaseOrder[]
}

const lifecycleTiles = [
  {
    label: 'Demand',
    route: '/procurement/requisitions',
    copy: 'Capture requisitions and route approvals before sourcing.',
  },
  {
    label: 'Sourcing',
    route: '/procurement/rfqs',
    copy: 'Create RFQs and collect supplier quotations from approved records.',
  },
  {
    label: 'Commitment',
    route: '/procurement/purchase-orders',
    copy: 'Issue purchase orders only after valid procurement evidence exists.',
  },
  {
    label: 'Matching',
    route: '/procurement/matching',
    copy: 'Review PO, receipt, and invoice alignment before payment approval.',
  },
]

export function ProcurementHubPage({
  session,
  navigate,
  roleCodes,
}: {
  session: AppSession
  navigate: (path: string) => void
  roleCodes: AppRoleCode[]
}) {
  const { getProcurementSummary } = useProcurementSummary(session, roleCodes)
  const { listProjects } = useProjects(session)
  const { listSuppliers } = useSuppliers(session)
  const { listRequisitions } = useRequisitions(session)
  const { listPurchaseOrders } = usePurchaseOrders(session)
  const [state, setState] = useState<LoadState<ProcurementHubData>>({
    status: 'loading',
  })

  const loadHubData = useCallback(async (): Promise<ProcurementHubData> => {
    const [
      summary,
      projects,
      suppliers,
      requisitions,
      purchaseOrders,
    ] = await Promise.all([
      getProcurementSummary(),
      listProjects<HubProject>(),
      listSuppliers<HubSupplier>(),
      listRequisitions<HubRequisition>(),
      listPurchaseOrders<HubPurchaseOrder>(),
    ])

    return {
      summary,
      projects,
      suppliers,
      requisitions,
      purchaseOrders,
    }
  }, [
    getProcurementSummary,
    listProjects,
    listPurchaseOrders,
    listRequisitions,
    listSuppliers,
  ])

  useEffect(() => {
    let cancelled = false

    loadHubData()
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
                : 'Unable to load procurement hub',
          })
        }
      })

    return () => {
      cancelled = true
    }
  }, [loadHubData])

  return (
    <>
      <PageHeader
        eyebrow="Source-to-contract / Procure-to-pay"
        title="Procurement Hub"
        action={
          <button
            type="button"
            onClick={() => navigate('/procurement/requisitions/new')}
          >
            New requisition
          </button>
        }
      />
      {state.status === 'loading' ? (
        <LoadingState message="Loading procurement hub..." />
      ) : null}
      {state.status === 'error' ? (
        <ErrorState
          title="Unable to load procurement hub"
          message={state.message}
        />
      ) : null}
      {state.status === 'ready' ? (
        <ProcurementHubContent data={state.data} navigate={navigate} />
      ) : null}
    </>
  )
}

function ProcurementHubContent({
  data,
  navigate,
}: {
  data: ProcurementHubData
  navigate: (path: string) => void
}) {
  const summary = data.summary
  const metrics = summary.metrics
  const matchingExceptions =
    findSummaryMetric(metrics, 'matching-exceptions')?.value ?? 0
  const recentRequisitions = data.requisitions.slice(0, 4)
  const recentPurchaseOrders = data.purchaseOrders.slice(0, 4)
  const highlightedSuppliers = data.suppliers.slice(0, 4)

  return (
    <div className="procurement-hub">
      {matchingExceptions ? (
        <section className="procurement-alert procurement-alert--danger">
          <div>
            <span className="eyebrow">Blocked action</span>
            <strong>
              {matchingExceptions} receipt or invoice match exception
              {matchingExceptions > 1 ? 's' : ''}
            </strong>
            <p>
              Resolve exceptions before payment approval or finance evidence
              handoff. Matching is backend-backed; no successful match is shown
              without matching data.
            </p>
          </div>
          <button type="button" onClick={() => navigate('/procurement/matching')}>
            Open matching queue
          </button>
        </section>
      ) : (
        <section className="procurement-alert procurement-alert--neutral">
          <div>
            <span className="eyebrow">Matching status</span>
            <strong>No active match exceptions returned</strong>
            <p>
              The hub is using backend summary DTOs for current queue, blocker,
              and readiness state. Supplier scoring remains post-demo hardening.
            </p>
          </div>
          <button type="button" onClick={() => navigate('/procurement/matching')}>
            Review matching
          </button>
        </section>
      )}

      <section className="procurement-hub-kpis" aria-label="Procurement KPIs">
        {metrics.map((metric) => (
          <HubKpi
            key={metric.id}
            label={metric.label}
            value={metric.value}
            tone={summaryToneForSeverity(metric.severity)}
            detail={metric.helper}
          />
        ))}
      </section>

      <section className="procurement-hub-grid">
        <article className="procurement-hub-panel procurement-hub-panel--wide">
          <div className="procurement-hub-panel-header">
            <div>
              <span className="eyebrow">Workflow cockpit</span>
              <h2>Procurement evidence flow</h2>
            </div>
            <button
              type="button"
              className="button button--secondary"
              onClick={() => navigate('/procurement/requisitions')}
            >
              Open requisitions
            </button>
          </div>
          <div className="procurement-flow-tiles">
            {lifecycleTiles.map((tile, index) => (
              <button
                className="procurement-flow-tile"
                key={tile.route}
                type="button"
                onClick={() => navigate(tile.route)}
              >
                <span>{String(index + 1).padStart(2, '0')}</span>
                <strong>{tile.label}</strong>
                <small>{tile.copy}</small>
              </button>
            ))}
          </div>
        </article>

        <article className="procurement-hub-panel">
          <div className="procurement-hub-panel-header">
            <div>
              <span className="eyebrow">Sourcing</span>
              <h2>RFQ and quotation pulse</h2>
            </div>
          </div>
          <div className="procurement-pulse-grid">
            <div>
              <span>Queue items</span>
              <strong>{summary.queue.length}</strong>
            </div>
            <div>
              <span>Readiness checks</span>
              <strong>{summary.readiness.length}</strong>
            </div>
          </div>
          <div className="inline-actions">
            <button type="button" onClick={() => navigate('/procurement/rfqs')}>
              RFQs
            </button>
            <button
              type="button"
              onClick={() => navigate('/procurement/quotations/compare')}
            >
              Compare
            </button>
          </div>
        </article>
      </section>

      <section className="procurement-hub-grid">
        <SummaryListPanel
          title="Backend queue"
          eyebrow="DTO-backed"
          empty="No procurement queue items returned."
        >
          {summary.queue.map((item) => (
            <button
              className="procurement-record-card"
              key={item.id}
              type="button"
              onClick={() => navigate(item.targetRoute)}
            >
              <div>
                <strong>{item.title}</strong>
                <span>{item.description}</span>
              </div>
              <StatusBadge status={item.status} />
            </button>
          ))}
        </SummaryListPanel>

        <SummaryListPanel
          title="Review readiness"
          eyebrow="Server computed"
          empty="No readiness checks returned."
        >
          {summary.readiness.map((item) => (
            <button
              className="procurement-record-card"
              key={item.id}
              type="button"
              onClick={() => navigate(item.targetRoute)}
            >
              <div>
                <strong>{item.label}</strong>
                <span>
                  {item.ready}/{item.total} ready, {item.missing} missing
                </span>
              </div>
              <StatusBadge status={item.status} />
            </button>
          ))}
        </SummaryListPanel>
      </section>

      <section className="procurement-hub-columns">
        <HubListPanel
          title="Recent requisitions"
          eyebrow="Demand"
          empty="No requisitions returned."
          actionLabel="View all"
          onAction={() => navigate('/procurement/requisitions')}
        >
          {recentRequisitions.map((requisition) => (
            <button
              className="procurement-record-card"
              key={requisition.id}
              type="button"
              onClick={() => navigate(`/procurement/requisitions/${requisition.id}`)}
            >
              <div>
                <strong>{requisitionTitle(requisition)}</strong>
                <span>{formatCurrency(toHubNumber(requisition.totalAmount))}</span>
              </div>
              <StatusBadge status={requisition.status} />
            </button>
          ))}
        </HubListPanel>

        <HubListPanel
          title="Purchase order highlights"
          eyebrow="Fulfilment"
          empty="No purchase orders returned."
          actionLabel="View POs"
          onAction={() => navigate('/procurement/purchase-orders')}
        >
          {recentPurchaseOrders.map((purchaseOrder) => (
            <button
              className="procurement-record-card"
              key={purchaseOrder.id}
              type="button"
              onClick={() =>
                navigate(`/procurement/purchase-orders/${purchaseOrder.id}`)
              }
            >
              <div>
                <strong>{purchaseOrder.poNumber}</strong>
                <span>{purchaseOrder.supplier?.name ?? 'No supplier linked'}</span>
              </div>
              <StatusBadge status={purchaseOrder.status} />
            </button>
          ))}
        </HubListPanel>

        <HubListPanel
          title="Supplier coverage"
          eyebrow="Approved source base"
          empty="No suppliers returned."
          actionLabel="Suppliers"
          onAction={() => navigate('/procurement/suppliers')}
        >
          {highlightedSuppliers.map((supplier) => (
            <button
              className="procurement-record-card"
              key={supplier.id}
              type="button"
              onClick={() => navigate(`/procurement/suppliers/${supplier.id}`)}
            >
              <div>
                <strong>{supplier.name}</strong>
                <span>Score unavailable until supplier analytics DTO exists</span>
              </div>
              <StatusBadge status={supplier.status} />
            </button>
          ))}
        </HubListPanel>
      </section>

      <section className="procurement-hub-grid">
        <article className="procurement-hub-panel procurement-hub-panel--wide">
          <div className="procurement-hub-panel-header">
            <div>
              <span className="eyebrow">Implementation status</span>
              <h2>Backend-backed today</h2>
            </div>
          </div>
          <div className="procurement-module-links">
            <button type="button" onClick={() => navigate('/procurement/projects')}>
              Projects
            </button>
            <button
              type="button"
              onClick={() => navigate('/procurement/approvals')}
            >
              Approvals
            </button>
            <button
              type="button"
              onClick={() => navigate('/procurement/approval-rules')}
            >
              Approval rules
            </button>
            <button type="button" onClick={() => navigate('/procurement/receipts')}>
              Receipts
            </button>
            <button type="button" onClick={() => navigate('/procurement/invoices')}>
              Invoices
            </button>
          </div>
        </article>

        <article className="procurement-hub-panel procurement-hub-panel--muted">
          <span className="eyebrow">Not overstated</span>
          <h2>Analytics remain scoped</h2>
          <p>
            Spend trend, supplier score, delivery-rate, invoice-accuracy, and
            maverick-spend analytics are Figma reference patterns only in this
            phase. The production hub uses backend summary DTOs for safe counts,
            queue state, blockers, and readiness.
          </p>
        </article>
      </section>
    </div>
  )
}

function SummaryListPanel({
  eyebrow,
  title,
  empty,
  children,
}: {
  eyebrow: string
  title: string
  empty: string
  children: ReactNode
}) {
  const hasChildren =
    Array.isArray(children) ? children.filter(Boolean).length > 0 : Boolean(children)

  return (
    <article className="procurement-hub-panel">
      <div className="procurement-hub-panel-header">
        <div>
          <span className="eyebrow">{eyebrow}</span>
          <h2>{title}</h2>
        </div>
      </div>
      <div className="procurement-record-list">
        {hasChildren ? children : <EmptyState>{empty}</EmptyState>}
      </div>
    </article>
  )
}

function HubKpi({
  label,
  value,
  detail,
  tone,
}: {
  label: string
  value: string | number
  detail: string
  tone: 'blue' | 'green' | 'red' | 'amber' | 'purple'
}) {
  return (
    <article className={`procurement-hub-kpi procurement-hub-kpi--${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  )
}

function HubListPanel({
  eyebrow,
  title,
  empty,
  actionLabel,
  onAction,
  children,
}: {
  eyebrow: string
  title: string
  empty: string
  actionLabel: string
  onAction: () => void
  children: ReactNode
}) {
  const hasChildren =
    Array.isArray(children) ? children.filter(Boolean).length > 0 : Boolean(children)

  return (
    <article className="procurement-hub-panel">
      <div className="procurement-hub-panel-header">
        <div>
          <span className="eyebrow">{eyebrow}</span>
          <h2>{title}</h2>
        </div>
        <button type="button" className="button button--ghost" onClick={onAction}>
          {actionLabel}
        </button>
      </div>
      <div className="procurement-record-list">
        {hasChildren ? children : <EmptyState>{empty}</EmptyState>}
      </div>
    </article>
  )
}

function requisitionTitle(requisition: HubRequisition) {
  if ('title' in requisition && typeof requisition.title === 'string') {
    return requisition.title
  }

  return `Requisition ${requisition.id.slice(0, 8)}`
}
