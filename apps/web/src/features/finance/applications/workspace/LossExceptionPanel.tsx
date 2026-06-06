import { useState } from 'react'

import type { AppRoleCode, AppSession } from '../../../../shared/types'
import { formatCurrency, formatDateTime } from '../../../../shared/utils/formatting'
import { useLossExceptions } from '../../api/useLossExceptions'
import {
  isLossExceptionClosureBlocking,
  lossExceptionClassificationLabels,
  lossExceptionClassifications,
  lossExceptionStatusLabels,
} from './applicationWorkspace.model'
import type {
  ApplicationWorkspace,
  LossException,
  LossExceptionClassification,
} from './applicationWorkspace.types'

export function LossExceptionPanel({
  workspace,
  roleCodes,
  session,
  onRefresh,
}: {
  workspace: ApplicationWorkspace
  roleCodes: AppRoleCode[]
  session: AppSession
  onRefresh: () => Promise<void>
}) {
  const { attachEvidence, classifyLossException, resolveLossException } =
    useLossExceptions(session)
  const [pendingAction, setPendingAction] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  async function runAction(actionId: string, action: () => Promise<void>) {
    setMessage(null)
    setPendingAction(actionId)
    try {
      await action()
      await onRefresh()
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Unable to update loss exception workflow',
      )
    } finally {
      setPendingAction(null)
    }
  }

  async function startEvidenceReview(exception: LossException) {
    await runAction(`evidence:${exception.id}`, async () => {
      await attachEvidence(
        exception.id,
        {
          actorUserId: session.actorUserId || undefined,
          notes: 'Evidence review started from the application workspace.',
        },
        workspace.id,
      )
      setMessage('Loss exception evidence review started.')
    })
  }

  async function recordDecision(
    exception: LossException,
    classification: LossExceptionClassification,
    rationale: string,
  ) {
    await runAction(`decision:${exception.id}`, async () => {
      await classifyLossException(
        exception.id,
        {
          actorUserId: session.actorUserId || undefined,
          reviewerUserId: session.actorUserId || undefined,
          classification,
          rationale,
        },
        workspace.id,
      )
      setMessage('Reviewer decision recorded.')
    })
  }

  async function resolveForClosure(exception: LossException) {
    await runAction(`resolve:${exception.id}`, async () => {
      await resolveLossException(
        exception.id,
        {
          actorUserId: session.actorUserId || undefined,
          notes: 'Resolved from the application workspace for closure review.',
        },
        workspace.id,
      )
      setMessage('Loss exception resolved for closure-gate evaluation.')
    })
  }

  return (
    <section
      aria-labelledby="loss-exception-panel-title"
      className="workspace-panel loss-exception-panel"
    >
      <div className="workspace-panel-header">
        <div>
          <span>Loss exception workflow</span>
          <h2 id="loss-exception-panel-title">Reviewer classification</h2>
        </div>
        <strong>
          {workspace.closureBlockedByLossException
            ? 'Closure blocked'
            : 'Closure gate clear'}
        </strong>
      </div>
      <p>
        Negative profit/loss outcomes require reviewer handling before closure.
        Genuine commercial loss does not create a guaranteed or fixed return.
      </p>
      {message ? <p className="notice">{message}</p> : null}
      {workspace.lossExceptions.length ? (
        <div className="loss-exception-list">
          {workspace.lossExceptions.map((exception) => (
            <LossExceptionCard
              key={exception.id}
              exception={exception}
              isPending={pendingAction?.endsWith(exception.id) ?? false}
              roleCodes={roleCodes}
              actorAvailable={Boolean(session.actorUserId)}
              currency={workspace.currency}
              onStartEvidenceReview={startEvidenceReview}
              onRecordDecision={recordDecision}
              onResolve={resolveForClosure}
            />
          ))}
        </div>
      ) : (
        <p>No loss exceptions are recorded for this application.</p>
      )}
    </section>
  )
}

function LossExceptionCard({
  exception,
  roleCodes,
  actorAvailable,
  currency,
  isPending,
  onStartEvidenceReview,
  onRecordDecision,
  onResolve,
}: {
  exception: LossException
  roleCodes: AppRoleCode[]
  actorAvailable: boolean
  currency: string
  isPending: boolean
  onStartEvidenceReview: (exception: LossException) => Promise<void>
  onRecordDecision: (
    exception: LossException,
    classification: LossExceptionClassification,
    rationale: string,
  ) => Promise<void>
  onResolve: (exception: LossException) => Promise<void>
}) {
  const [classification, setClassification] =
    useState<LossExceptionClassification>(exception.classification)
  const [rationale, setRationale] = useState(exception.rationale ?? '')
  const canAttachEvidence =
    actorAvailable &&
    hasAnyRole(roleCodes, [
      'ORG_ADMIN',
      'FINANCE_ACCOUNTANT',
      'FINANCIER_USER',
      'SHARIAH_REVIEWER',
      'AUDITOR',
    ]) &&
    ['OPEN', 'EVIDENCE_REQUESTED', 'UNDER_REVIEW', 'REOPENED'].includes(
      exception.status,
    )
  const canClassify =
    actorAvailable &&
    hasAnyRole(roleCodes, ['ORG_ADMIN', 'FINANCIER_USER', 'SHARIAH_REVIEWER']) &&
    exception.status === 'UNDER_REVIEW'
  const canResolve =
    actorAvailable &&
    hasAnyRole(roleCodes, ['ORG_ADMIN', 'FINANCIER_USER', 'SHARIAH_REVIEWER']) &&
    exception.status === 'CLASSIFIED'
  const blocked = isLossExceptionClosureBlocking(exception.status)

  return (
    <article className="loss-exception-card">
      <div className="loss-exception-card__summary">
        <div>
          <span>{lossExceptionStatusLabels[exception.status]}</span>
          <strong>
            {lossExceptionClassificationLabels[exception.classification]}
          </strong>
          <p>
            {formatCurrency(exception.amount, currency)} exception amount
            {exception.statementId
              ? ` linked to P/L ${exception.statementId}`
              : ''}
          </p>
        </div>
        <span
          className={
            blocked
              ? 'status-tag status-tag--degraded'
              : 'status-tag status-tag--COMPLETED'
          }
        >
          {blocked ? 'Blocking closure' : 'Resolved'}
        </span>
      </div>
      {exception.notes ? <p>{exception.notes}</p> : null}
      {exception.rationale ? (
        <p>
          <strong>Reviewer rationale:</strong> {exception.rationale}
        </p>
      ) : null}
      <div className="loss-exception-meta">
        <span>Opened {formatDateTime(exception.createdAt)}</span>
        <span>Decision {formatDateTime(exception.decidedAt)}</span>
        <span>Resolved {formatDateTime(exception.resolvedAt)}</span>
      </div>
      <div className="loss-exception-actions">
        <button
          className="button button--secondary"
          disabled={!canAttachEvidence || isPending}
          type="button"
          onClick={() => void onStartEvidenceReview(exception)}
        >
          Start evidence review
        </button>
        <label className="field">
          <span>Classification</span>
          <select
            disabled={!canClassify || isPending}
            value={classification}
            onChange={(event) =>
              setClassification(event.target.value as LossExceptionClassification)
            }
          >
            {lossExceptionClassifications.map((option) => (
              <option key={option} value={option}>
                {lossExceptionClassificationLabels[option]}
              </option>
            ))}
          </select>
        </label>
        <label className="field loss-exception-rationale">
          <span>Rationale</span>
          <textarea
            disabled={!canClassify || isPending}
            value={rationale}
            onChange={(event) => setRationale(event.target.value)}
            placeholder="Record reviewer rationale"
            rows={3}
          />
        </label>
        <button
          className="button button--primary"
          disabled={!canClassify || !rationale.trim() || isPending}
          type="button"
          onClick={() =>
            void onRecordDecision(exception, classification, rationale)
          }
        >
          Record decision
        </button>
        <button
          className="button button--secondary"
          disabled={!canResolve || isPending}
          type="button"
          onClick={() => void onResolve(exception)}
        >
          Resolve for closure
        </button>
      </div>
      {!actorAvailable ? (
        <p className="notice">Actor session is required for reviewer actions.</p>
      ) : null}
    </article>
  )
}

function hasAnyRole(
  roleCodes: readonly AppRoleCode[],
  allowedRoles: readonly AppRoleCode[],
) {
  return allowedRoles.some((roleCode) => roleCodes.includes(roleCode))
}
