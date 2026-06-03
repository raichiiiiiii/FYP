import type { AppRoleCode } from '../../../shared/types'
import { EmptyState } from '../../../shared/components/EmptyState'
import { StatusBadge } from '../../../shared/components/StatusBadge'
import { WorkflowStepper } from '../../../shared/components/WorkflowStepper'
import { formatCurrency } from '../../../shared/utils/formatting'
import type { RequisitionAction, RequisitionRecord } from './requisition.types'
import {
  canCreateRequisition,
  canReviewRequisitions,
  canSubmitRequisition,
  displayRequisitionStatus,
  getApprovalActionState,
  summarizeRequisitions,
  toNumber,
} from './requisition.validation'

const requisitionLifecycle = [
  'DRAFT',
  'SUBMITTED',
  'APPROVED',
  'SOURCING',
  'CONVERTED_TO_PO',
]

export function RequisitionList({
  requisitions,
  roleCodes,
  actorUserId,
  isUpdating,
  onCreate,
  onOpen,
  onTransition,
}: {
  requisitions: RequisitionRecord[]
  roleCodes: readonly AppRoleCode[]
  actorUserId?: string | null
  isUpdating: boolean
  onCreate: () => void
  onOpen: (id: string) => void
  onTransition: (id: string, action: RequisitionAction) => void
}) {
  const summary = summarizeRequisitions(requisitions)
  const canCreate = canCreateRequisition(roleCodes)
  const canReview = canReviewRequisitions(roleCodes)

  return (
    <div className="procurement-workspace">
      <section className="procurement-summary">
        <article>
          <span>Total requisitions</span>
          <strong>{summary.total}</strong>
        </article>
        <article>
          <span>Pending approval</span>
          <strong>{summary.submitted}</strong>
        </article>
        <article>
          <span>Approved</span>
          <strong>{summary.approved}</strong>
        </article>
        <article>
          <span>Total requested</span>
          <strong>{formatCurrency(summary.totalValue)}</strong>
        </article>
      </section>

      <section className="table-section">
        <div className="section-heading-row">
          <div>
            <h2>Requisition records</h2>
            <p>
              Capture demand, route approvals, and preserve procurement evidence
              before sourcing or finance opportunity creation.
            </p>
          </div>
          <button type="button" disabled={!canCreate} onClick={onCreate}>
            New requisition
          </button>
        </div>

        {!canCreate ? (
          <p className="notice">
            Creation is hidden from this role. Reviewers can inspect submitted
            records and act from the approval inbox.
          </p>
        ) : null}

        {requisitions.length ? (
          <div className="requisition-list">
            {requisitions.map((requisition) => {
              const approvalState = getApprovalActionState(
                requisition,
                roleCodes,
                actorUserId,
              )
              const canSubmit = canSubmitRequisition(requisition, roleCodes)
              const status = displayRequisitionStatus(requisition.status)

              return (
                <article className="requisition-card" key={requisition.id}>
                  <div className="requisition-card-main">
                    <strong>{requisition.title}</strong>
                    <span>{requisition.project?.name ?? 'No project linked'}</span>
                    <small>
                      {requisition.requesterUser?.displayName ?? 'Requester not set'}
                    </small>
                  </div>
                  <StatusBadge status={status} />
                  <div className="requisition-card-meta">
                    <span>Total</span>
                    <strong>{formatCurrency(toNumber(requisition.totalAmount))}</strong>
                  </div>
                  <WorkflowStepper steps={requisitionLifecycle} current={status} />
                  <div className="inline-actions">
                    <button type="button" onClick={() => onOpen(requisition.id)}>
                      Open
                    </button>
                    <button
                      type="button"
                      disabled={!canSubmit || isUpdating}
                      onClick={() => onTransition(requisition.id, 'submit')}
                    >
                      Submit
                    </button>
                    {canReview ? (
                      <>
                        <button
                          type="button"
                          disabled={!approvalState.canApprove || isUpdating}
                          title={approvalState.reason}
                          onClick={() => onTransition(requisition.id, 'approve')}
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          disabled={!approvalState.canReject || isUpdating}
                          title={approvalState.reason}
                          onClick={() => onTransition(requisition.id, 'reject')}
                        >
                          Reject
                        </button>
                      </>
                    ) : null}
                  </div>
                  {approvalState.reason ? (
                    <p className="requisition-reason">{approvalState.reason}</p>
                  ) : null}
                </article>
              )
            })}
          </div>
        ) : (
          <EmptyState
            title="No requisitions yet"
            action={
              <button type="button" disabled={!canCreate} onClick={onCreate}>
                Create first requisition
              </button>
            }
          >
            Start with a controlled demand record before RFQ, PO, receipt,
            invoice, matching, or finance evidence.
          </EmptyState>
        )}
      </section>
    </div>
  )
}
