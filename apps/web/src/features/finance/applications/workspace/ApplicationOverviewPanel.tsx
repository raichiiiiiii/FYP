import type { AppRoleCode } from '../../../../shared/types'
import { formatCurrency, formatDateTime } from '../../../../shared/utils/formatting'
import { applicationStatusLabels } from '../applications.model'
import { ApplicationStatusBadge } from '../ApplicationStatusBadge'
import {
  buildWorkspaceActions,
  buildWorkspaceRoleProfile,
} from './applicationWorkspace.model'
import type { ApplicationWorkspace } from './applicationWorkspace.types'

export function ApplicationOverviewPanel({
  workspace,
  roleCodes,
}: {
  workspace: ApplicationWorkspace
  roleCodes: AppRoleCode[]
}) {
  const roleProfile = buildWorkspaceRoleProfile(roleCodes)
  const actions = buildWorkspaceActions(workspace, roleCodes).filter(
    (action) => action.visible,
  )
  const verifiedEvidenceCount = workspace.evidence.filter((item) =>
    ['verified', 'waived'].includes(item.status),
  ).length
  const evidenceTotal = workspace.evidence.length

  return (
    <>
      <section className="workspace-hero">
        <div>
          <span>Mudarabah application</span>
          <h2>{workspace.opportunityTitle}</h2>
          <p>
            {workspace.applicantOrganizationName}
            {workspace.financierOrganizationName
              ? ` -> ${workspace.financierOrganizationName}`
              : ''}
          </p>
        </div>
        <ApplicationStatusBadge status={workspace.status} />
      </section>

      <section className="workspace-overview-grid">
        <article>
          <span>Requested capital</span>
          <strong>
            {formatCurrency(
              workspace.requestedCapitalAmount,
              workspace.currency,
            )}
          </strong>
        </article>
        <article>
          <span>Expected revenue</span>
          <strong>
            {formatCurrency(
              workspace.expectedRevenueAmount,
              workspace.currency,
            )}
          </strong>
        </article>
        <article>
          <span>Expected cost</span>
          <strong>
            {formatCurrency(workspace.expectedCostAmount, workspace.currency)}
          </strong>
        </article>
        <article>
          <span>Profit ratio</span>
          <strong>
            {workspace.proposedProfitRatio.rabbUlMal || 0} /{' '}
            {workspace.proposedProfitRatio.mudarib || 0}
          </strong>
        </article>
        <article>
          <span>Evidence readiness</span>
          <strong>
            {verifiedEvidenceCount}/{evidenceTotal || 0}
          </strong>
        </article>
        <article>
          <span>Financier decision</span>
          <strong>{workspace.financierDecision.replace(/_/g, ' ')}</strong>
        </article>
        <article>
          <span>Shariah decision</span>
          <strong>{workspace.shariahDecision.replace(/_/g, ' ')}</strong>
        </article>
        <article>
          <span>Audit events</span>
          <strong>{workspace.auditSummary.materialEventCount}</strong>
        </article>
      </section>

      <section className="workspace-panels">
        <article className="workspace-panel">
          <div className="workspace-panel-header">
            <div>
              <span>Current state</span>
              <h2>{applicationStatusLabels[workspace.status]}</h2>
            </div>
          </div>
          <p>
            The workspace is rendering the application state and lifecycle only.
            Material decisions, disbursement, ledger, and closure actions are
            intentionally disabled in Slice 4A/4B.
          </p>
          {roleProfile.isReadOnly ? (
            <p className="notice">
              Auditor access is read-only. Audit, evidence, and closure states
              are visible without exposing finance mutation controls.
            </p>
          ) : null}
        </article>

        <article className="workspace-panel">
          <div className="workspace-panel-header">
            <div>
              <span>Role actions</span>
              <h2>Read-only action map</h2>
            </div>
          </div>
          {actions.length ? (
            <div className="workspace-action-list">
              {actions.map((action) => (
                <div className="workspace-action" key={action.id}>
                  <div>
                    <strong>{action.label}</strong>
                    <span>{action.roleScope}</span>
                    <p>{action.reason}</p>
                  </div>
                  <button type="button" disabled={!action.enabled}>
                    {action.enabled ? 'Start' : 'Read-only'}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p>No role-specific actions are visible for this session.</p>
          )}
        </article>

        <article className="workspace-panel">
          <div className="workspace-panel-header">
            <div>
              <span>Audit summary</span>
              <h2>{workspace.auditSummary.latestEventType}</h2>
            </div>
          </div>
          <p>
            Latest material event:{' '}
            {formatDateTime(workspace.auditSummary.latestEventAt)}
          </p>
          <p>Anchor status: {workspace.auditSummary.anchorStatus}</p>
        </article>
      </section>
    </>
  )
}
