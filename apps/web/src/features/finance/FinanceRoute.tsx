import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { NavLink, Route, Routes, useParams } from 'react-router-dom'

import { PageHeader as SharedPageHeader } from '../../layouts/PageHeader'
import { ConfirmDialog } from '../../shared/components/ConfirmDialog'
import { EmptyState } from '../../shared/components/EmptyState'
import { Field as SharedField } from '../../shared/components/Field'
import { StatusBadge } from '../../shared/components/StatusBadge'
import type { AppRoleCode, AppSession } from '../../shared/types'
import { WorkflowStepper } from '../../shared/components/WorkflowStepper'
import { formatCurrency, formatDateTime } from '../../shared/utils/formatting'
import { useAuth } from '../auth/useAuth'
import { useApplications } from './api/useApplications'
import { useClosures } from './api/useClosures'
import { useContracts } from './api/useContracts'
import { useDisbursements } from './api/useDisbursements'
import { useLedgers } from './api/useLedgers'
import { useProfitLoss } from './api/useProfitLoss'
import { LossExceptionPanel } from './applications/workspace/LossExceptionPanel'
import { mapApplicationWorkspace } from './applications/workspace/applicationWorkspace.model'
import type { ApplicationWorkspaceRawDto } from './applications/workspace/applicationWorkspace.types'
import { ApplicationsPage } from './applications/ApplicationsPage'
import {
  calculateProfitLossSummary,
  displayLedgerEntryType,
  formatProfitShareRatio,
  getLossTreatmentExplanation,
  getProfitLossFinding,
  groupLedgerEntriesByReviewRole,
  hasGuaranteedFixedReturnPattern,
  mapLedgerEntry,
  mapProfitLossStatement,
} from './ledger/ledger.model'
import { OpportunitiesPage } from './opportunities/OpportunitiesPage'
import {
  blockedReason,
  buildWorkspaceRoleGuidance,
  displayFinanceState,
  formatRatio,
  summarizeChecklist,
  summarizeWorkspaceLedger,
} from './financeWorkspaceDisplay.model'

type FinanceRouteProps = {
  session: AppSession
  navigate: (path: string) => void
}

type Project = {
  id: string
  name: string
  code?: string | null
  budget?: number | null
}

type Supplier = {
  id: string
  name: string
}

type PurchaseOrder = {
  id: string
  poNumber: string
  status: string
  totalAmount: number
  supplier?: Supplier | null
}

type EvidencePack = {
  id: string
  title: string
  status: string
  items?: EvidenceItem[]
}

type EvidenceItem = {
  id: string
  label: string
  evidenceType: string
}

type Opportunity = {
  id: string
  title: string
  description?: string | null
  estimatedCapital: number
  expectedProfit?: number | null
  currency: string
  status: string
  project?: Project | null
  purchaseOrder?: PurchaseOrder | null
  evidencePack?: EvidencePack | null
}

type ChecklistItem = {
  id: string
  requiredCode: string
  label: string
  status: string
  evidenceItem?: EvidenceItem | null
}

type EvidenceChecklist = {
  id: string
  status: string
  items: ChecklistItem[]
}

type UserSummary = {
  id: string
  email: string
  displayName: string
}

type DueDiligenceReport = {
  id: string
  status: string
  riskRating: string
  decision?: string | null
  notes?: string | null
  reviewerUser?: UserSummary | null
  createdAt: string
}

type ShariahReview = {
  id: string
  status: string
  decision?: string | null
  opinion: string
  reviewerUser?: UserSummary | null
  createdAt: string
}

type Contract = {
  id: string
  applicationId: string
  contractNumber: string
  restrictedUse: string
  status: string
  signedAt?: string | null
  application?: MudarabahApplication | null
}

type Disbursement = {
  id: string
  amount: number
  currency: string
  reference?: string | null
  disbursedAt: string
}

type LedgerEntry = {
  id: string
  applicationId: string
  entryType: string
  description: string
  amount: number
  currency: string
  occurredAt: string
  sourceDocumentId?: string | null
  application?: MudarabahApplication | null
}

type ProfitDistribution = {
  id: string
  party: string
  ratio: number
  amount: number
}

type LossException = {
  id: string
  statementId?: string | null
  exceptionType: string
  status?: string | null
  amount: number
  notes?: string | null
  decision?: string | null
  rationale?: string | null
  reviewerUserId?: string | null
  decidedAt?: string | null
  resolvedAt?: string | null
  createdAt?: string | null
}

type ProfitLossStatement = {
  id: string
  applicationId: string
  revenue: number
  costs: number
  netProfit: number
  status?: string
  createdAt: string
  distributions?: ProfitDistribution[]
  lossExceptions?: LossException[]
  application?: MudarabahApplication | null
}

type ClosurePack = {
  id: string
  applicationId: string
  status?: string
  evidencePack?: EvidencePack | null
  summary?: Record<string, unknown> | null
  exportedAt: string
  application?: MudarabahApplication | null
}

type MudarabahApplication = {
  id: string
  opportunityId: string
  applicantUserId?: string | null
  requestedCapital: number
  currency: string
  purpose?: string | null
  status: string
  capitalProviderRatio: number
  entrepreneurRatio: number
  opportunity?: Opportunity | null
  applicantUser?: UserSummary | null
  evidenceChecklist?: EvidenceChecklist | null
  dueDiligenceReports?: DueDiligenceReport[]
  shariahReviews?: ShariahReview[]
  contracts?: Contract[]
  disbursements?: Disbursement[]
  ledgerEntries?: LedgerEntry[]
  profitLossStatements?: ProfitLossStatement[]
  lossExceptions?: LossException[]
  closurePacks?: ClosurePack[]
}

type GeneratedContractDocument = {
  document: {
    id: string
    title: string
  }
  version: {
    id: string
    fileName: string
    contentHash?: string | null
  }
  esignPackageRequest: {
    id: string
    status: string
  }
  mockSigningStatus: string
}

type LoadState<T> =
  | { status: 'loading' }
  | { status: 'ready'; data: T }
  | { status: 'error'; message: string }

const financeLifecycleStates = [
  'DRAFT',
  'SUBMITTED',
  'EVIDENCE_PENDING',
  'DUE_DILIGENCE_IN_REVIEW',
  'SHARIAH_IN_REVIEW',
  'APPROVED',
  'CONTRACT_PENDING_SIGNATURE',
  'CONTRACT_EXECUTED',
  'DISBURSED',
  'MONITORING',
  'PROFIT_LOSS_CALCULATED',
  'CLOSED',
]

const financeWorkspaceTabs = [
  ['overview', 'Overview'],
  ['evidence', 'Evidence'],
  ['due-diligence', 'Due Diligence'],
  ['shariah-review', 'Shariah Review'],
  ['contract', 'Contract'],
  ['disbursement', 'Disbursement'],
  ['ledger', 'Ledger'],
  ['profit-loss', 'Profit/Loss'],
  ['closure', 'Closure'],
  ['audit', 'Audit'],
] as const

type FinanceWorkspaceTab = (typeof financeWorkspaceTabs)[number][0]

type FinanceRoleScope = {
  canSubmitEvidence: boolean
  canReviewFinance: boolean
  canReviewShariah: boolean
  canCreateContract: boolean
  canRecordDisbursement: boolean
  canRecordLedger: boolean
  canCalculateProfitLoss: boolean
  canExportClosure: boolean
  isAuditor: boolean
}

function buildFinanceRoleScope(roleCodes: AppRoleCode[]): FinanceRoleScope {
  const hasRole = (roles: AppRoleCode[]) =>
    roles.some((role) => roleCodes.includes(role))
  const isFinanceOperator = hasRole(['ORG_ADMIN', 'FINANCIER_USER'])

  return {
    canSubmitEvidence: hasRole([
      'ORG_ADMIN',
      'PROCUREMENT_OFFICER',
      'FINANCIER_USER',
    ]),
    canReviewFinance: isFinanceOperator,
    canReviewShariah: hasRole(['ORG_ADMIN', 'SHARIAH_REVIEWER']),
    canCreateContract: isFinanceOperator,
    canRecordDisbursement: isFinanceOperator,
    canRecordLedger: isFinanceOperator,
    canCalculateProfitLoss: isFinanceOperator,
    canExportClosure: isFinanceOperator,
    isAuditor: hasRole(['AUDITOR']),
  }
}

function canOperateFinanceRecords(roleCodes: readonly AppRoleCode[]) {
  return roleCodes.some((roleCode) =>
    ['ORG_ADMIN', 'FINANCIER_USER'].includes(roleCode),
  )
}

function normalizeWorkspaceTab(tab?: string): FinanceWorkspaceTab {
  return financeWorkspaceTabs.some(([value]) => value === tab)
    ? (tab as FinanceWorkspaceTab)
    : 'overview'
}

function scopedBody(session: AppSession, body: Record<string, unknown> = {}) {
  if (!session.organizationId) {
    throw new Error('Create an organization first')
  }

  return {
    organizationId: session.organizationId,
    actorUserId: session.actorUserId,
    ...body,
  }
}

function getQueryParam(name: string) {
  return new URLSearchParams(window.location.search).get(name) || ''
}

function PageHeader({
  eyebrow,
  title,
  action,
}: {
  eyebrow: string
  title: string
  action?: ReactNode
}) {
  return <SharedPageHeader eyebrow={eyebrow} title={title} action={action} />
}

function Field({
  label,
  name,
  type = 'text',
  required = false,
  value,
  onChange,
}: {
  label: string
  name: string
  type?: string
  required?: boolean
  value: string
  onChange: (value: string) => void
}) {
  return (
    <SharedField
      label={label}
      name={name}
      type={type}
      required={required}
      value={value}
      onChange={onChange}
    />
  )
}

function EmptyNotice({ children }: { children: ReactNode }) {
  return <EmptyState>{children}</EmptyState>
}

function StatusTag({ status }: { status: string }) {
  return <StatusBadge status={status} />
}

function FinanceLifecycleTrack({ status }: { status: string }) {
  return (
    <WorkflowStepper
      steps={financeLifecycleStates}
      current={status}
      variant="finance"
    />
  )
}

function ApplicationSelector({
  applications,
  value,
  onChange,
}: {
  applications: MudarabahApplication[]
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="field">
      <span>Application</span>
      <select
        required
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">Select application</option>
        {applications.map((application) => (
          <option key={application.id} value={application.id}>
            {application.opportunity?.title ?? application.id} - {application.status}
          </option>
        ))}
      </select>
    </label>
  )
}

function OpportunitiesScreen({
  session,
  navigate,
  roleCodes,
}: {
  session: AppSession
  navigate: (path: string) => void
  roleCodes: AppRoleCode[]
}) {
  return (
    <OpportunitiesPage
      session={session}
      navigate={navigate}
      roleCodes={roleCodes}
    />
  )
}

function ApplicationsScreen({
  session,
  navigate,
  roleCodes,
}: {
  session: AppSession
  navigate: (path: string) => void
  roleCodes: AppRoleCode[]
}) {
  return (
    <ApplicationsPage
      session={session}
      navigate={navigate}
      roleCodes={roleCodes}
    />
  )
}

function ApplicationDetailScreen({
  session,
  applicationId,
  workspaceTab,
  roleCodes,
}: {
  session: AppSession
  applicationId: string
  workspaceTab?: string
  roleCodes: AppRoleCode[]
}) {
  return (
    <LegacyApplicationDetailScreen
      session={session}
      applicationId={applicationId}
      workspaceTab={workspaceTab}
      roleCodes={roleCodes}
    />
  )
}

export function LegacyApplicationDetailScreen({
  session,
  applicationId,
  workspaceTab,
  roleCodes,
}: {
  session: AppSession
  applicationId: string
  workspaceTab?: string
  roleCodes: AppRoleCode[]
}) {
  const {
    getApplication,
    createEvidenceChecklist,
    completeChecklistItem,
    runApplicationAction,
  } = useApplications(session)
  const {
    createContract: createContractRecord,
    markContractSigned,
    generateContractDocument,
  } = useContracts(session)
  const { createDisbursement } = useDisbursements(session)
  const { createLedgerEntry } = useLedgers(session)
  const { createProfitLossStatement } = useProfitLoss(session)
  const { createClosure: createClosureRecord } = useClosures(session)
  const [state, setState] = useState<LoadState<MudarabahApplication>>({
    status: 'loading',
  })
  const [restrictedUse, setRestrictedUse] = useState(
    'Restricted to approved procurement project costs only',
  )
  const [signerEmail, setSignerEmail] = useState('')
  const [disbursementAmount, setDisbursementAmount] = useState('')
  const [disbursementReference, setDisbursementReference] = useState('')
  const [ledgerEntryType, setLedgerEntryType] = useState('REVENUE')
  const [ledgerDescription, setLedgerDescription] = useState(
    'Project revenue recorded',
  )
  const [ledgerAmount, setLedgerAmount] = useState('14000')
  const [profitRevenue, setProfitRevenue] = useState('')
  const [profitCosts, setProfitCosts] = useState('')
  const [confirmingClosure, setConfirmingClosure] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const selectedTab = normalizeWorkspaceTab(workspaceTab)
  const roleScope = useMemo(() => buildFinanceRoleScope(roleCodes), [roleCodes])
  const loadApplication = useCallback(
    () => getApplication<MudarabahApplication>(applicationId),
    [applicationId, getApplication],
  )

  async function refresh() {
    setState({ status: 'ready', data: await loadApplication() })
  }

  useEffect(() => {
    let cancelled = false

    loadApplication()
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
              error instanceof Error ? error.message : 'Unable to load application',
          })
        }
      })

    return () => {
      cancelled = true
    }
  }, [loadApplication])

  async function runAction(
    label: string,
    action: 'evidence-checklist' | 'due-diligence' | 'shariah-review' | 'approve',
    body: Record<string, unknown> = {},
  ) {
    setMessage(null)

    try {
      if (action === 'evidence-checklist') {
        await createEvidenceChecklist<unknown>(applicationId, {
          actorUserId: session.actorUserId,
          ...body,
        })
      } else {
        await runApplicationAction<unknown>(applicationId, action, {
          actorUserId: session.actorUserId,
          ...body,
        })
      }
      await refresh()
      setMessage(label)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Action failed')
    }
  }

  async function completeChecklist(items: ChecklistItem[]) {
    setMessage(null)

    try {
      await Promise.all(
        items
          .filter((item) => item.status !== 'COMPLETED')
          .map((item) =>
            completeChecklistItem<ChecklistItem>(item.id, applicationId, {
              actorUserId: session.actorUserId,
            }),
          ),
      )
      await refresh()
      setMessage('Checklist completed')
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Unable to complete checklist',
      )
    }
  }

  async function createContractForApplication(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage(null)

    try {
      await createContractRecord<Contract>(
        scopedBody(session, {
          applicationId,
          restrictedUse,
        }),
      )
      await refresh()
      setMessage('Contract created')
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Unable to create contract',
      )
    }
  }

  async function requestContractDocument(contractId: string) {
    setMessage(null)

    try {
      await generateContractDocument<GeneratedContractDocument>(contractId, {
        actorUserId: session.actorUserId,
        signerEmail: signerEmail || undefined,
      })
      await refresh()
      setMessage('Mock e-signature package requested')
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Unable to request e-signature package',
      )
    }
  }

  async function markSigned(contractId: string) {
    setMessage(null)

    try {
      await markContractSigned<Contract>(contractId, {
        actorUserId: session.actorUserId,
      })
      await refresh()
      setMessage('Contract signed')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to sign contract')
    }
  }

  async function recordDisbursement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage(null)

    try {
      await createDisbursement<Disbursement>(
        scopedBody(session, {
          applicationId,
          contractId: latestContract?.id,
          amount: disbursementAmount || undefined,
          reference: disbursementReference || undefined,
          currency: 'MYR',
        }),
      )
      await refresh()
      setMessage('Disbursement recorded')
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Unable to record disbursement',
      )
    }
  }

  async function recordLedgerEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage(null)

    try {
      await createLedgerEntry<LedgerEntry>(
        scopedBody(session, {
          applicationId,
          entryType: ledgerEntryType,
          description: ledgerDescription,
          amount: ledgerAmount,
          currency: 'MYR',
        }),
      )
      await refresh()
      setMessage('Ledger entry recorded')
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Unable to record ledger entry',
      )
    }
  }

  async function generateProfitLoss(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage(null)

    try {
      await createProfitLossStatement<ProfitLossStatement>(
        scopedBody(session, {
          applicationId,
          revenue: profitRevenue || undefined,
          costs: profitCosts || undefined,
        }),
      )
      await refresh()
      setMessage('Profit/loss statement generated')
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Unable to generate profit/loss statement',
      )
    }
  }

  async function createClosure() {
    setConfirmingClosure(false)
    setMessage(null)

    try {
      await createClosureRecord<ClosurePack>(
        scopedBody(session, {
          applicationId,
        }),
      )
      await refresh()
      setMessage('Closure pack exported')
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Unable to export closure pack',
      )
    }
  }

  const application = state.status === 'ready' ? state.data : null
  const checklist = application?.evidenceChecklist
  const latestDueDiligence = application?.dueDiligenceReports?.[0]
  const latestShariahReview = application?.shariahReviews?.[0]
  const latestContract = application?.contracts?.[0]
  const latestDisbursement = application?.disbursements?.[0]
  const latestProfitLoss = application?.profitLossStatements?.[0]
  const latestClosure = application?.closurePacks?.[0]
  const workspaceView = application
    ? mapApplicationWorkspace(application as unknown as ApplicationWorkspaceRawDto)
    : null
  const showOverview = selectedTab === 'overview'
  const showEvidence = showOverview || selectedTab === 'evidence'
  const showDueDiligence = showOverview || selectedTab === 'due-diligence'
  const showShariah = showOverview || selectedTab === 'shariah-review'
  const showContract = showOverview || selectedTab === 'contract'
  const showDisbursement = showOverview || selectedTab === 'disbursement'
  const showLedger = showOverview || selectedTab === 'ledger'
  const showProfitLoss = showOverview || selectedTab === 'profit-loss'
  const showClosure = showOverview || selectedTab === 'closure'
  const showLossExceptionPanel =
    selectedTab === 'profit-loss' || selectedTab === 'closure'
  const showAudit = showOverview || selectedTab === 'audit'
  const evidenceReadiness = summarizeChecklist(checklist)
  const ledgerSummary = application
    ? summarizeWorkspaceLedger(application)
    : null
  const roleGuidance = application
    ? buildWorkspaceRoleGuidance(roleScope, application.status, evidenceReadiness)
    : null
  const currentLifecyclePosition = application
    ? Math.max(financeLifecycleStates.indexOf(application.status), 0) + 1
    : 0
  const expectedRevenue =
    Number(application?.opportunity?.estimatedCapital ?? 0) +
    Number(application?.opportunity?.expectedProfit ?? 0)
  const expectedMargin = expectedRevenue
    ? Math.round(
        (Number(application?.opportunity?.expectedProfit ?? 0) /
          expectedRevenue) *
          100,
      )
    : 0

  return (
    <>
      <PageHeader
        eyebrow="Mudarabah workflow"
        title="Application workspace"
        action={
          <NavLink className="button button--secondary" to="/finance/applications">
            Back to pipeline
          </NavLink>
        }
      />
      {state.status === 'loading' ? (
        <EmptyNotice>Loading application...</EmptyNotice>
      ) : null}
      {state.status === 'error' ? (
        <p className="error-text">{state.message}</p>
      ) : null}
      {message ? <p className="notice">{message}</p> : null}
      {application ? (
        <>
          <section className="finance-workspace-hero">
            <div className="finance-workspace-hero__main">
              <span className="finance-workspace-kicker">
                {application.id}
              </span>
              <h2>
                {application.opportunity?.title ?? application.opportunityId}
              </h2>
              <p>
                {application.applicantUser?.displayName ||
                  application.applicantUser?.email ||
                  'Applicant pending'}{' '}
                uses procurement evidence to support restricted mudarabah
                capital.
              </p>
              <div className="finance-workspace-tags">
                <StatusTag status={application.status} />
                <span>{currentLifecyclePosition}/{financeLifecycleStates.length} lifecycle gates</span>
                <span>{roleCodes.join(', ') || 'No assigned role'}</span>
              </div>
            </div>
            <div className="finance-workspace-hero__side">
              <span>Requested capital</span>
              <strong>
                {formatCurrency(application.requestedCapital, application.currency)}
              </strong>
              <small>
                Profit ratio {formatRatio(application.capitalProviderRatio)} /{' '}
                {formatRatio(application.entrepreneurRatio)}
              </small>
            </div>
          </section>

          <nav className="module-tabs" aria-label="Finance workspace tabs">
            {financeWorkspaceTabs.map(([value, label]) => (
              <NavLink
                key={value}
                className={({ isActive }) =>
                  isActive || selectedTab === value
                    ? 'module-tab active'
                    : 'module-tab'
                }
                to={`/finance/applications/${applicationId}/${value}`}
              >
                {label}
              </NavLink>
            ))}
          </nav>

          <section className="finance-workspace-summary">
            <article className="finance-workspace-guidance">
              <span>Role guidance</span>
              <strong>{roleGuidance?.title}</strong>
              <p>{roleGuidance?.message}</p>
            </article>
            <article>
              <span>Evidence readiness</span>
              <strong>{evidenceReadiness.progress}%</strong>
              <div
                className="finance-readiness-bar"
                aria-label="Evidence readiness progress"
              >
                <span style={{ width: `${evidenceReadiness.progress}%` }} />
              </div>
              <small>
                {evidenceReadiness.readyCount}/{evidenceReadiness.total || 0}{' '}
                complete or waived
              </small>
            </article>
            <article>
              <span>Expected economics</span>
              <strong>{formatCurrency(expectedRevenue, application.currency)}</strong>
              <small>
                Expected profit margin {expectedMargin}% from current opportunity
                data.
              </small>
            </article>
            <article>
              <span>Status</span>
              <strong>{displayFinanceState(application.status)}</strong>
              <small>
                Contract, disbursement, ledger, and closure remain backend-gated.
              </small>
            </article>
          </section>

          <section className="finance-workspace-lifecycle">
            <div>
              <span>Lifecycle</span>
              <h2>Gate-by-gate progress</h2>
            </div>
            <FinanceLifecycleTrack status={application.status} />
          </section>

          <section className="split-grid finance-workspace-grid">
            {showEvidence ? (
            <form className="form-grid finance-workspace-panel">
              <div className="finance-workspace-panel-header">
                <div>
                  <span>Evidence checklist</span>
                  <h2>Evidence readiness</h2>
                </div>
                <strong>{evidenceReadiness.progress}% ready</strong>
              </div>
              <div className="finance-readiness-bar">
                <span style={{ width: `${evidenceReadiness.progress}%` }} />
              </div>
              <div className="finance-workspace-mini-grid">
                <article>
                  <span>Complete</span>
                  <strong>{evidenceReadiness.completed}</strong>
                </article>
                <article>
                  <span>Waived</span>
                  <strong>{evidenceReadiness.waived}</strong>
                </article>
                <article>
                  <span>Missing</span>
                  <strong>{evidenceReadiness.missing}</strong>
                </article>
                <article>
                  <span>Rejected</span>
                  <strong>{evidenceReadiness.rejected}</strong>
                </article>
              </div>
              {evidenceReadiness.missing ? (
                <p className="finance-blocked-note">
                  Incomplete checklist items can block due diligence and final
                  application approval. Use linked procurement evidence; do not
                  substitute UI-only evidence.
                </p>
              ) : (
                <p className="finance-safe-note">
                  Evidence is complete or waived according to the current
                  backend checklist response.
                </p>
              )}
              <div className="form-actions">
                {roleScope.canSubmitEvidence ? (
                  <>
                    <button
                      type="button"
                      disabled={
                        !['SUBMITTED', 'EVIDENCE_PENDING'].includes(
                          application.status,
                        )
                      }
                      onClick={() =>
                        void runAction(
                          'Checklist generated',
                          'evidence-checklist',
                        )
                      }
                    >
                      Generate checklist
                    </button>
                    {blockedReason(
                      ['SUBMITTED', 'EVIDENCE_PENDING'].includes(
                        application.status,
                      ),
                      'Checklist generation is only available after submission or while evidence is pending.',
                    ) ? (
                      <span className="action-reason">
                        {blockedReason(
                          ['SUBMITTED', 'EVIDENCE_PENDING'].includes(
                            application.status,
                          ),
                          'Checklist generation is only available after submission or while evidence is pending.',
                        )}
                      </span>
                    ) : null}
                    <button
                      type="button"
                      disabled={!checklist?.items?.length}
                      onClick={() => void completeChecklist(checklist?.items ?? [])}
                    >
                      Complete items
                    </button>
                    {!checklist?.items?.length ? (
                      <span className="action-reason">
                        Generate the backend checklist before completing items.
                      </span>
                    ) : null}
                  </>
                ) : (
                  <span>Read-only evidence review</span>
                )}
              </div>
              {checklist?.items?.length ? (
                <div className="finance-evidence-checklist">
                  {checklist.items.map((item) => (
                    <article
                      className={`finance-evidence-item finance-evidence-item--${item.status.toLowerCase()}`}
                      key={item.id}
                    >
                      <div>
                        <strong>{item.label}</strong>
                        <span>{item.requiredCode}</span>
                      </div>
                      <StatusTag status={item.status} />
                      <small>
                        {item.evidenceItem
                          ? `Linked evidence ${item.evidenceItem.id}`
                          : 'No linked evidence item yet'}
                      </small>
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyNotice>No checklist generated.</EmptyNotice>
              )}
            </form>
            ) : null}
            {showDueDiligence || showShariah ? (
            <form className="form-grid finance-workspace-panel">
              <div className="finance-workspace-panel-header">
                <div>
                  <span>Reviewer gates</span>
                  <h2>Due diligence and Shariah review</h2>
                </div>
                <StatusTag
                  status={
                    latestShariahReview?.status ||
                    latestDueDiligence?.status ||
                    'PENDING'
                  }
                />
              </div>
              <div className="finance-review-grid">
                {showDueDiligence ? (
                  <article className="finance-review-card finance-review-card--due">
                    <div>
                      <span>Financier due diligence</span>
                      <strong>{latestDueDiligence?.riskRating ?? 'Pending'}</strong>
                    </div>
                    <StatusTag status={latestDueDiligence?.status ?? 'PENDING'} />
                    <p>
                      Review buyer credibility, supplier reliability, cost
                      reasonableness, delivery risk, and expected realization
                      assumptions.
                    </p>
                  </article>
                ) : null}
                {showShariah ? (
                  <article className="finance-review-card finance-review-card--shariah">
                    <div>
                      <span>Shariah/compliance review</span>
                      <strong>{latestShariahReview?.decision ?? 'Pending'}</strong>
                    </div>
                    <StatusTag status={latestShariahReview?.status ?? 'PENDING'} />
                    <p>
                      Validate eligible goods/services, restricted use, profit
                      ratio, allowed expenses, loss treatment, and no guaranteed
                      fixed return.
                    </p>
                  </article>
                ) : null}
              </div>
              {latestDueDiligence?.status !== 'APPROVED' ? (
                <p className="finance-blocked-note">
                  Shariah review and final approval remain blocked until due
                  diligence is approved by an authorized financier reviewer.
                </p>
              ) : latestShariahReview?.status !== 'APPROVED' ? (
                <p className="finance-blocked-note">
                  Final approval and contract generation remain blocked until
                  Shariah review is approved.
                </p>
              ) : (
                <p className="finance-safe-note">
                  Both reviewer gates are approved in the current backend
                  response. Final approval is still a separate backend action.
                </p>
              )}
              <div className="form-actions">
                {roleScope.canReviewFinance ? (
                  <button
                    type="button"
                    disabled={
                      !['DUE_DILIGENCE_IN_REVIEW', 'SHARIAH_IN_REVIEW'].includes(
                        application.status,
                      ) || latestDueDiligence?.status === 'APPROVED'
                    }
                    onClick={() =>
                      void runAction(
                        'Due diligence approved',
                        'due-diligence',
                        {
                          reviewerUserId: session.actorUserId,
                          status: 'APPROVED',
                          riskRating: 'MEDIUM',
                          decision: 'APPROVED',
                        },
                      )
                    }
                  >
                    Approve due diligence
                  </button>
                ) : null}
                {roleScope.canReviewFinance &&
                (!['DUE_DILIGENCE_IN_REVIEW', 'SHARIAH_IN_REVIEW'].includes(
                  application.status,
                ) ||
                  latestDueDiligence?.status === 'APPROVED') ? (
                  <span className="action-reason">
                    Due diligence action is available only in the due diligence
                    review gate and is disabled once approved.
                  </span>
                ) : null}
                {roleScope.canReviewShariah ? (
                  <button
                    type="button"
                    disabled={
                      latestDueDiligence?.status !== 'APPROVED' ||
                      latestShariahReview?.status === 'APPROVED'
                    }
                    onClick={() =>
                      void runAction(
                        'Shariah review approved',
                        'shariah-review',
                        {
                          reviewerUserId: session.actorUserId,
                          status: 'APPROVED',
                          decision: 'APPROVED',
                        },
                      )
                    }
                  >
                    Approve Shariah
                  </button>
                ) : null}
                {roleScope.canReviewShariah &&
                (latestDueDiligence?.status !== 'APPROVED' ||
                  latestShariahReview?.status === 'APPROVED') ? (
                  <span className="action-reason">
                    Shariah action requires approved due diligence and no prior
                    approved Shariah review.
                  </span>
                ) : null}
                {roleScope.canReviewFinance ? (
                  <button
                    type="button"
                    disabled={
                      latestDueDiligence?.status !== 'APPROVED' ||
                      latestShariahReview?.status !== 'APPROVED' ||
                      application.status === 'APPROVED'
                    }
                    onClick={() =>
                      void runAction(
                        'Application approved',
                        'approve',
                      )
                    }
                  >
                    Approve application
                  </button>
                ) : null}
                {roleScope.canReviewFinance &&
                (latestDueDiligence?.status !== 'APPROVED' ||
                  latestShariahReview?.status !== 'APPROVED' ||
                  application.status === 'APPROVED') ? (
                  <span className="action-reason">
                    Final approval requires both reviewer decisions to be
                    approved and cannot re-approve an approved application.
                  </span>
                ) : null}
              </div>
            </form>
            ) : null}
            {showContract ? (
              <form
                className="form-grid finance-workspace-panel"
                onSubmit={(event) => void createContractForApplication(event)}
              >
                <div className="finance-workspace-panel-header">
                  <div>
                    <span>Restricted contract</span>
                    <h2>Contract and e-signature package</h2>
                  </div>
                  <StatusTag status={latestContract?.status ?? 'NOT_CREATED'} />
                </div>
                {application.status !== 'APPROVED' ? (
                  <p className="finance-blocked-note">
                    Contract creation remains blocked until the application is
                    approved after financier and Shariah review gates.
                  </p>
                ) : (
                  <p className="finance-safe-note">
                    Application is approved. Contract creation will still be
                    validated by the backend before any record is created.
                  </p>
                )}
                <Field
                  label="Restricted use"
                  name="restrictedUse"
                  required
                  value={restrictedUse}
                  onChange={setRestrictedUse}
                />
                <Field
                  label="Signer email"
                  name="signerEmail"
                  type="email"
                  value={signerEmail}
                  onChange={setSignerEmail}
                />
                <div className="form-actions">
                  {roleScope.canCreateContract ? (
                    <>
                      <button
                        type="submit"
                        disabled={application.status !== 'APPROVED'}
                      >
                        Create contract
                      </button>
                      {application.status !== 'APPROVED' ? (
                        <span className="action-reason">
                          Requires application status APPROVED.
                        </span>
                      ) : null}
                      <button
                        type="button"
                        disabled={!latestContract}
                        onClick={() =>
                          latestContract
                            ? void requestContractDocument(latestContract.id)
                            : undefined
                        }
                      >
                        Generate document
                      </button>
                      {!latestContract ? (
                        <span className="action-reason">
                          Create the backend contract record before requesting
                          a document/e-sign package.
                        </span>
                      ) : null}
                      <button
                        type="button"
                        disabled={latestContract?.status !== 'PENDING_SIGNATURE'}
                        onClick={() =>
                          latestContract ? void markSigned(latestContract.id) : undefined
                        }
                      >
                        Mark signed
                      </button>
                      {latestContract?.status !== 'PENDING_SIGNATURE' ? (
                        <span className="action-reason">
                          Mark signed is available only when the contract is
                          pending signature.
                        </span>
                      ) : null}
                    </>
                  ) : (
                    <span>Contract terms are read-only for this role.</span>
                  )}
                </div>
                <div className="finance-status-stack">
                  <article className="finance-status-row">
                    <strong>{latestContract?.contractNumber ?? 'No contract'}</strong>
                    <span>
                      {latestContract?.restrictedUse ?? 'Contract not created'}
                    </span>
                    <StatusTag status={latestContract?.status ?? 'PENDING'} />
                  </article>
                </div>
              </form>
            ) : null}
            {showDisbursement ? (
              <form
                className="form-grid finance-workspace-panel"
                onSubmit={(event) => void recordDisbursement(event)}
              >
                <div className="finance-workspace-panel-header">
                  <div>
                    <span>Controlled capital release</span>
                    <h2>Disbursement</h2>
                  </div>
                  <StatusTag status={latestDisbursement ? 'RECORDED' : 'PENDING'} />
                </div>
                {latestContract?.status !== 'EXECUTED' ? (
                  <p className="finance-blocked-note">
                    Disbursement remains blocked until the restricted contract is
                    executed and recorded as EXECUTED.
                  </p>
                ) : (
                  <p className="finance-safe-note">
                    Contract is executed. Any disbursement record still passes
                    through backend validation and audit creation.
                  </p>
                )}
                <Field
                  label="Disbursement amount"
                  name="disbursementAmount"
                  type="number"
                  value={disbursementAmount}
                  onChange={setDisbursementAmount}
                />
                <Field
                  label="Reference"
                  name="disbursementReference"
                  value={disbursementReference}
                  onChange={setDisbursementReference}
                />
                <div className="form-actions">
                  {roleScope.canRecordDisbursement ? (
                    <button
                      type="submit"
                      disabled={latestContract?.status !== 'EXECUTED'}
                    >
                      Record disbursement
                    </button>
                  ) : (
                    <span>Disbursement is read-only for this role.</span>
                  )}
                </div>
                <div className="finance-status-stack">
                  <article className="finance-status-row">
                    <strong>
                      {latestDisbursement
                        ? formatCurrency(
                            latestDisbursement.amount,
                            latestDisbursement.currency,
                          )
                        : 'No disbursement'}
                    </strong>
                    <span>{latestDisbursement?.reference ?? 'Pending execution'}</span>
                    <StatusTag status={latestDisbursement ? 'RECORDED' : 'PENDING'} />
                  </article>
                </div>
              </form>
            ) : null}
            {showLedger ? (
              <form
                className="form-grid finance-workspace-panel"
                onSubmit={(event) => void recordLedgerEntry(event)}
              >
                <div className="finance-workspace-panel-header">
                  <div>
                    <span>Project monitoring</span>
                    <h2>Ledger evidence</h2>
                  </div>
                  <NavLink
                    className="button button--secondary"
                    to={`/finance/ledgers?applicationId=${application.id}`}
                  >
                    Open ledger
                  </NavLink>
                </div>
                <div className="finance-workspace-mini-grid">
                  <article>
                    <span>Revenue</span>
                    <strong>
                      {formatCurrency(ledgerSummary?.revenue, application.currency)}
                    </strong>
                  </article>
                  <article>
                    <span>Allowed costs</span>
                    <strong>
                      {formatCurrency(ledgerSummary?.costs, application.currency)}
                    </strong>
                  </article>
                  <article>
                    <span>Capital</span>
                    <strong>
                      {formatCurrency(ledgerSummary?.capital, application.currency)}
                    </strong>
                  </article>
                  <article>
                    <span>Entries</span>
                    <strong>{ledgerSummary?.entries ?? 0}</strong>
                  </article>
                </div>
                {!['DISBURSED', 'MONITORING'].includes(application.status) ? (
                  <p className="finance-blocked-note">
                    Ledger entry creation starts after controlled disbursement.
                    Earlier states are visible for review only.
                  </p>
                ) : null}
                <label className="field">
                  <span>Entry type</span>
                  <select
                    value={ledgerEntryType}
                    onChange={(event) => setLedgerEntryType(event.target.value)}
                  >
                    <option value="REVENUE">Revenue</option>
                    <option value="COST">Cost</option>
                    <option value="EXPENSE">Expense</option>
                  </select>
                </label>
                <Field
                  label="Description"
                  name="ledgerDescription"
                  required
                  value={ledgerDescription}
                  onChange={setLedgerDescription}
                />
                <Field
                  label="Amount"
                  name="ledgerAmount"
                  type="number"
                  required
                  value={ledgerAmount}
                  onChange={setLedgerAmount}
                />
                <div className="form-actions">
                  {roleScope.canRecordLedger ? (
                    <button
                      type="submit"
                      disabled={
                        !['DISBURSED', 'MONITORING'].includes(application.status)
                      }
                    >
                      Record ledger entry
                    </button>
                  ) : (
                    <span>Ledger is read-only for this role.</span>
                  )}
                </div>
                {application.ledgerEntries?.length ? (
                  <div className="data-table data-table--finance">
                    {application.ledgerEntries.map((entry) => (
                      <article key={entry.id}>
                        <strong>{entry.entryType}</strong>
                        <span>{entry.description}</span>
                        <span>{formatCurrency(entry.amount, entry.currency)}</span>
                        <span>{formatDateTime(entry.occurredAt)}</span>
                      </article>
                    ))}
                  </div>
                ) : (
                  <EmptyNotice>No ledger entries recorded.</EmptyNotice>
                )}
              </form>
            ) : null}
            {showProfitLoss ? (
              <form
                className="form-grid finance-workspace-panel"
                onSubmit={(event) => void generateProfitLoss(event)}
              >
                <div className="finance-workspace-panel-header">
                  <div>
                    <span>Profit/loss</span>
                    <h2>Distribution preview and calculation gate</h2>
                  </div>
                  <NavLink
                    className="button button--secondary"
                    to={`/finance/profit-loss?applicationId=${application.id}`}
                  >
                    Open P/L
                  </NavLink>
                </div>
                <div className="finance-workspace-mini-grid">
                  <article>
                    <span>Net from ledger</span>
                    <strong>
                      {formatCurrency(ledgerSummary?.net, application.currency)}
                    </strong>
                  </article>
                  <article>
                    <span>Rabb-ul-Mal share</span>
                    <strong>{formatRatio(application.capitalProviderRatio)}</strong>
                  </article>
                  <article>
                    <span>Mudarib share</span>
                    <strong>{formatRatio(application.entrepreneurRatio)}</strong>
                  </article>
                  <article>
                    <span>Fixed return check</span>
                    <strong>Not calculated</strong>
                  </article>
                </div>
                <p className="finance-safe-note">
                  This workspace does not calculate a guaranteed fixed return.
                  Distribution is shown only after positive realized project
                  profit and approved ratio-based calculation.
                </p>
                <Field
                  label="Revenue override"
                  name="profitRevenue"
                  type="number"
                  value={profitRevenue}
                  onChange={setProfitRevenue}
                />
                <Field
                  label="Cost override"
                  name="profitCosts"
                  type="number"
                  value={profitCosts}
                  onChange={setProfitCosts}
                />
                <div className="form-actions">
                  {roleScope.canCalculateProfitLoss ? (
                    <button
                      type="submit"
                      disabled={
                        !['MONITORING', 'PROFIT_LOSS_CALCULATED'].includes(
                          application.status,
                        )
                      }
                    >
                      Generate statement
                    </button>
                  ) : (
                    <span>Profit/loss is read-only for this role.</span>
                  )}
                </div>
                <div className="finance-status-stack">
                  <article className="finance-status-row">
                    <strong>
                      Net{' '}
                      {latestProfitLoss
                        ? formatCurrency(latestProfitLoss.netProfit)
                        : 'pending'}
                    </strong>
                    <span>
                      Ratio {application.capitalProviderRatio} /{' '}
                      {application.entrepreneurRatio}
                    </span>
                    <StatusTag status={latestProfitLoss?.status ?? 'PENDING'} />
                  </article>
                </div>
              </form>
            ) : null}
            {showClosure ? (
              <section className="form-grid finance-workspace-panel">
                <div className="finance-workspace-panel-header">
                  <div>
                    <span>Closure evidence</span>
                    <h2>Closure pack</h2>
                  </div>
                  <NavLink
                    className="button button--secondary"
                    to={`/finance/closures?applicationId=${application.id}`}
                  >
                    Open closures
                  </NavLink>
                </div>
                {application.status !== 'PROFIT_LOSS_CALCULATED' ? (
                  <p className="finance-blocked-note">
                    Closure export remains blocked until profit/loss has been
                    calculated and reviewer evidence is ready.
                  </p>
                ) : (
                  <p className="finance-safe-note">
                    Profit/loss is calculated. Closure export still records a
                    backend closure pack and audit event.
                  </p>
                )}
                <div className="form-actions">
                  {roleScope.canExportClosure ? (
                    <button
                      type="button"
                      disabled={application.status !== 'PROFIT_LOSS_CALCULATED'}
                      onClick={() => setConfirmingClosure(true)}
                    >
                      Export closure
                    </button>
                  ) : (
                    <span>Closure pack is read-only for this role.</span>
                  )}
                </div>
                <div className="finance-status-stack">
                  <article className="finance-status-row">
                    <strong>{latestClosure?.id ?? 'No closure pack'}</strong>
                    <span>
                      {latestClosure
                        ? formatDateTime(latestClosure.exportedAt)
                        : 'Awaiting profit/loss statement'}
                    </span>
                    <StatusTag status={latestClosure ? 'CLOSED' : 'PENDING'} />
                  </article>
                </div>
              </section>
            ) : null}
            {showLossExceptionPanel && workspaceView ? (
              <LossExceptionPanel
                workspace={workspaceView}
                roleCodes={roleCodes}
                session={session}
                onRefresh={refresh}
              />
            ) : null}
            {showAudit ? (
              <section className="form-grid finance-workspace-panel">
                <div className="finance-workspace-panel-header">
                  <div>
                    <span>Audit and verification</span>
                    <h2>Audit timeline</h2>
                  </div>
                  <StatusTag status="LOCAL_AUDIT" />
                </div>
                <p className="notice">
                  Audit timeline links back to this application and the procurement
                  opportunity. Reviewers can use it to verify approvals, contract
                  state, ledger events, and closure export.
                </p>
                <p className="finance-blocked-note">
                  Fabric verification is not implied here. Anchor status must
                  come from audit/hash/outbox records, not from UI presentation.
                </p>
                <div className="form-actions">
                  <NavLink
                    className="button button--secondary"
                    to={`/audit/entity/MudarabahApplication/${application.id}`}
                  >
                    Open audit timeline
                  </NavLink>
                </div>
              </section>
            ) : null}
          </section>
          <ConfirmDialog
            open={confirmingClosure}
            title="Export closure pack?"
            message="This records the finance closure state after profit/loss calculation. Continue only when reviewer checks are complete."
            confirmLabel="Confirm export"
            onCancel={() => setConfirmingClosure(false)}
            onConfirm={() => void createClosure()}
          />
        </>
      ) : null}
    </>
  )
}

function ContractsScreen({ session }: { session: AppSession }) {
  const { listApplications } = useApplications(session)
  const {
    listContracts,
    createContract: createContractRecord,
    markContractSigned,
    generateContractDocument,
  } = useContracts(session)
  const [applications, setApplications] = useState<MudarabahApplication[]>([])
  const [contracts, setContracts] = useState<Contract[]>([])
  const [applicationId, setApplicationId] = useState(getQueryParam('applicationId'))
  const [restrictedUse, setRestrictedUse] = useState(
    'Restricted to approved procurement project costs only',
  )
  const [signerEmail, setSignerEmail] = useState('')
  const [message, setMessage] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    const [applicationRows, contractRows] = await Promise.all([
      listApplications<MudarabahApplication>(),
      listContracts<Contract>(),
    ])

    return { applications: applicationRows, contracts: contractRows }
  }, [listApplications, listContracts])

  async function refresh() {
    const data = await loadData()
    setApplications(data.applications)
    setContracts(data.contracts)
  }

  useEffect(() => {
    let cancelled = false

    loadData()
      .then((data) => {
        if (!cancelled) {
          setApplications(data.applications)
          setContracts(data.contracts)
          setApplicationId(
            (current) =>
              current ||
              data.applications.find((app) => app.status === 'APPROVED')?.id ||
              '',
          )
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setMessage(
            error instanceof Error ? error.message : 'Unable to load contracts',
          )
        }
      })

    return () => {
      cancelled = true
    }
  }, [loadData])

  async function createContract(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage(null)

    try {
      await createContractRecord<Contract>(
        scopedBody(session, {
          applicationId,
          restrictedUse,
        }),
      )
      await refresh()
      setMessage('Contract created')
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Unable to create contract',
      )
    }
  }

  async function markSigned(id: string) {
    setMessage(null)

    try {
      await markContractSigned<Contract>(id, {
        actorUserId: session.actorUserId,
      })
      await refresh()
      setMessage('Contract signed')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to sign contract')
    }
  }

  async function requestDocument(id: string) {
    setMessage(null)

    try {
      await generateContractDocument<GeneratedContractDocument>(id, {
        actorUserId: session.actorUserId,
        signerEmail: signerEmail || undefined,
      })
      await refresh()
      setMessage('Mock e-signature package requested')
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Unable to request e-signature package',
      )
    }
  }

  return (
    <>
      <PageHeader eyebrow="Restricted contract" title="Contracts" />
      <form
        className="form-grid"
        onSubmit={(event) => void createContract(event)}
      >
        <h2>Create contract</h2>
        <ApplicationSelector
          applications={applications}
          value={applicationId}
          onChange={setApplicationId}
        />
        <Field
          label="Restricted use"
          name="restrictedUse"
          required
          value={restrictedUse}
          onChange={setRestrictedUse}
        />
        <Field
          label="Signer email"
          name="signerEmail"
          type="email"
          value={signerEmail}
          onChange={setSignerEmail}
        />
        <div className="form-actions">
          <button type="submit" disabled={!applications.length}>
            Create contract
          </button>
          {message ? <p className="notice">{message}</p> : null}
        </div>
      </form>

      <section className="table-section">
        <h2>Contract records</h2>
        {contracts.length ? (
          <div className="data-table data-table--actions">
            {contracts.map((contract) => (
              <article key={contract.id}>
                <strong>{contract.contractNumber}</strong>
                <span>
                  {contract.application?.opportunity?.title ?? contract.applicationId}
                </span>
                <StatusTag status={contract.status} />
                <span>{contract.signedAt ? 'Signed' : 'Unsigned'}</span>
                <div className="inline-actions">
                  <button
                    type="button"
                    onClick={() => void requestDocument(contract.id)}
                  >
                    Generate document
                  </button>
                  <button
                    type="button"
                    disabled={contract.status !== 'PENDING_SIGNATURE'}
                    onClick={() => void markSigned(contract.id)}
                  >
                    Sign
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyNotice>No contracts found.</EmptyNotice>
        )}
      </section>
    </>
  )
}

function LedgersScreen({
  session,
  roleCodes,
}: {
  session: AppSession
  roleCodes: AppRoleCode[]
}) {
  const { listApplications } = useApplications(session)
  const { listLedgerEntries, createLedgerEntry } = useLedgers(session)
  const [applications, setApplications] = useState<MudarabahApplication[]>([])
  const [entries, setEntries] = useState<LedgerEntry[]>([])
  const [applicationId, setApplicationId] = useState(getQueryParam('applicationId'))
  const [entryType, setEntryType] = useState('REVENUE')
  const [description, setDescription] = useState('Project revenue recorded')
  const [amount, setAmount] = useState('14000')
  const [message, setMessage] = useState<string | null>(null)
  const canMutate = canOperateFinanceRecords(roleCodes)

  const loadData = useCallback(async () => {
    const [applicationRows, entryRows] = await Promise.all([
      listApplications<MudarabahApplication>(),
      listLedgerEntries<LedgerEntry>(),
    ])

    return { applications: applicationRows, entries: entryRows }
  }, [listApplications, listLedgerEntries])

  async function refresh() {
    const data = await loadData()
    setApplications(data.applications)
    setEntries(data.entries)
  }

  useEffect(() => {
    let cancelled = false

    loadData()
      .then((data) => {
        if (!cancelled) {
          setApplications(data.applications)
          setEntries(data.entries)
          setApplicationId(
            (current) =>
              current ||
              data.applications.find((app) =>
                ['DISBURSED', 'MONITORING'].includes(app.status),
              )?.id ||
              '',
          )
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setMessage(
            error instanceof Error ? error.message : 'Unable to load ledger',
          )
        }
      })

    return () => {
      cancelled = true
    }
  }, [loadData])

  async function createEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage(null)

    if (!canMutate) {
      setMessage('Ledger entry recording is restricted to finance reviewers.')
      return
    }

    try {
      await createLedgerEntry<LedgerEntry>(
        scopedBody(session, {
          applicationId,
          entryType,
          description,
          amount,
          currency: 'MYR',
        }),
      )
      await refresh()
      setMessage('Ledger entry recorded')
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Unable to record ledger entry',
      )
    }
  }

  const selectedApplication = applications.find(
    (application) => application.id === applicationId,
  )
  const mappedEntries = entries.map(mapLedgerEntry)
  const selectedEntries = applicationId
    ? mappedEntries.filter((entry) => entry.applicationId === applicationId)
    : mappedEntries
  const ledgerCurrency =
    selectedApplication?.currency || selectedEntries[0]?.currency || 'MYR'
  const preliminarySummary = calculateProfitLossSummary({
    applicationId: applicationId || selectedApplication?.id || 'unselected',
    entries: selectedEntries,
    currency: ledgerCurrency,
    profitShareRatio: {
      rabbUlMal: selectedApplication?.capitalProviderRatio ?? 0.6,
      mudarib: selectedApplication?.entrepreneurRatio ?? 0.4,
    },
  })
  const groupedLedgerEntries = groupLedgerEntriesByReviewRole(selectedEntries)
  const positiveDistributionReady = Boolean(preliminarySummary.distribution)
  const ledgerFinding = getProfitLossFinding(preliminarySummary)
  const lossTreatment = getLossTreatmentExplanation(preliminarySummary)

  return (
    <>
      <PageHeader
        eyebrow="Project ledger"
        title="Ledger and profit/loss review"
      />
      <section className="finance-review-hero">
        <div>
          <span>Reviewer scope</span>
          <h2>Project accounting evidence before closure</h2>
          <p>
            Ledger records separate buyer revenue, allowable project costs,
            capital monitoring, and exception entries. Profit is shared only from
            realized positive net profit using the approved ratio.
          </p>
        </div>
        <div className="finance-review-hero__callout">
          <strong>No guaranteed fixed return</strong>
          <span>
            Capital records support monitoring and audit. They are not used to
            calculate a fixed financier return.
          </span>
        </div>
      </section>

      <section
        className="finance-ledger-summary"
        aria-label="Preliminary profit and loss"
      >
        <article>
          <span>Total revenue</span>
          <strong>
            {formatCurrency(
              preliminarySummary.totalRevenue,
              preliminarySummary.currency,
            )}
          </strong>
        </article>
        <article>
          <span>Allowed costs</span>
          <strong>
            {formatCurrency(
              preliminarySummary.totalAllowedCost,
              preliminarySummary.currency,
            )}
          </strong>
        </article>
        <article>
          <span>Net profit/loss</span>
          <strong>
            {formatCurrency(
              preliminarySummary.netProfitOrLoss,
              preliminarySummary.currency,
            )}
          </strong>
        </article>
        <article>
          <span>P/L status</span>
          <StatusTag status={preliminarySummary.status.toUpperCase()} />
        </article>
      </section>

      <section className="finance-ledger-grid">
        <form
          className="form-grid finance-ledger-form"
          onSubmit={(event) => void createEntry(event)}
        >
          <h2>Record project accounting evidence</h2>
          <ApplicationSelector
            applications={applications}
            value={applicationId}
            onChange={setApplicationId}
          />
          <label className="field">
            <span>Entry type</span>
            <select
              value={entryType}
              onChange={(event) => setEntryType(event.target.value)}
            >
              <option value="REVENUE">Buyer receipt / revenue evidence</option>
              <option value="COST">Supplier payment / procurement cost</option>
              <option value="EXPENSE">Allowed expense</option>
              <option value="CAPITAL">Capital disbursement reference</option>
            </select>
          </label>
          <Field
            label="Description"
            name="description"
            required
            value={description}
            onChange={setDescription}
          />
          <Field
            label="Amount"
            name="amount"
            type="number"
            required
            value={amount}
            onChange={setAmount}
          />
          <div className="form-actions">
            <button type="submit" disabled={!applications.length || !canMutate}>
              Record entry
            </button>
            {message ? <p className="notice">{message}</p> : null}
            {!canMutate ? (
              <p className="notice">
                Read-only view. Ledger mutations are restricted to organization
                admins and financier users.
              </p>
            ) : null}
          </div>
        </form>

        <aside className="finance-pl-panel">
          <div className="finance-pl-panel-header">
            <span>Reviewer explanation</span>
            <h2>Distribution preview</h2>
          </div>
          <p>{ledgerFinding}</p>
          <p className={positiveDistributionReady ? 'finance-safe-note' : 'finance-blocked-note'}>
            {lossTreatment}
          </p>
          <dl>
            <div>
              <dt>Rabb-ul-Mal ratio</dt>
              <dd>
                {formatProfitShareRatio(
                  preliminarySummary.profitShareRatio.rabbUlMal,
                )}
              </dd>
            </div>
            <div>
              <dt>Mudarib ratio</dt>
              <dd>
                {formatProfitShareRatio(
                  preliminarySummary.profitShareRatio.mudarib,
                )}
              </dd>
            </div>
            <div>
              <dt>Rabb-ul-Mal share</dt>
              <dd>
                {formatCurrency(
                  preliminarySummary.distribution?.rabbUlMalAmount,
                  preliminarySummary.currency,
                )}
              </dd>
            </div>
            <div>
              <dt>Mudarib share</dt>
              <dd>
                {formatCurrency(
                  preliminarySummary.distribution?.mudaribAmount,
                  preliminarySummary.currency,
                )}
              </dd>
            </div>
          </dl>
          <p className="notice">
            Distribution appears only when realized project profit is positive.
            A genuine commercial loss does not produce a profit distribution or
            guaranteed capital return.
          </p>
          {preliminarySummary.evidenceLineage.length ? (
            <div className="finance-evidence-list">
              <h3>Evidence lineage</h3>
              {preliminarySummary.evidenceLineage.map((link) => (
                <span key={link.id}>
                  {link.label} · {link.role.replace('_', ' ')}
                </span>
              ))}
            </div>
          ) : (
            <EmptyNotice>No linked source evidence on ledger entries yet.</EmptyNotice>
          )}
        </aside>
      </section>

      <section className="table-section">
        <div className="section-heading-row">
          <div>
            <h2>Ledger records</h2>
            <p>
              Entries are grouped by reviewer purpose so revenue, costs, capital,
              and exceptions can be checked separately.
            </p>
          </div>
        </div>
        {selectedEntries.length ? (
          <div className="finance-ledger-groups">
            {groupedLedgerEntries.map((group) => (
              <section className="finance-ledger-group" key={group.id}>
                <div className="finance-ledger-group__header">
                  <div>
                    <span>{group.entries.length} record(s)</span>
                    <h3>{group.title}</h3>
                    <p>{group.description}</p>
                  </div>
                </div>
                {group.entries.length ? (
                  <div className="data-table data-table--ledger">
                    {group.entries.map((entry) => (
                      <article key={entry.id}>
                        <div>
                          <strong>{displayLedgerEntryType(entry.type)}</strong>
                          <span>{entry.description}</span>
                        </div>
                        <span>{formatCurrency(entry.amount, entry.currency)}</span>
                        <span>{formatDateTime(entry.occurredAt)}</span>
                        <span>
                          {entry.sourceDocumentLabel ||
                            entry.sourceDocumentId ||
                            'No linked evidence'}
                        </span>
                      </article>
                    ))}
                  </div>
                ) : (
                  <EmptyNotice>No records in this group yet.</EmptyNotice>
                )}
              </section>
            ))}
          </div>
        ) : (
          <EmptyNotice>No ledger entries found.</EmptyNotice>
        )}
      </section>
    </>
  )
}

function ProfitLossScreen({
  session,
  roleCodes,
}: {
  session: AppSession
  roleCodes: AppRoleCode[]
}) {
  const { listApplications } = useApplications(session)
  const {
    listProfitLossStatements,
    createProfitLossStatement,
  } = useProfitLoss(session)
  const [applications, setApplications] = useState<MudarabahApplication[]>([])
  const [statements, setStatements] = useState<ProfitLossStatement[]>([])
  const [applicationId, setApplicationId] = useState(getQueryParam('applicationId'))
  const [revenue, setRevenue] = useState('')
  const [costs, setCosts] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const canMutate = canOperateFinanceRecords(roleCodes)

  const loadData = useCallback(async () => {
    const [applicationRows, statementRows] = await Promise.all([
      listApplications<MudarabahApplication>(),
      listProfitLossStatements<ProfitLossStatement>(),
    ])

    return { applications: applicationRows, statements: statementRows }
  }, [listApplications, listProfitLossStatements])

  async function refresh() {
    const data = await loadData()
    setApplications(data.applications)
    setStatements(data.statements)
  }

  useEffect(() => {
    let cancelled = false

    loadData()
      .then((data) => {
        if (!cancelled) {
          setApplications(data.applications)
          setStatements(data.statements)
          setApplicationId(
            (current) =>
              current ||
              data.applications.find((app) => app.status === 'MONITORING')?.id ||
              '',
          )
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setMessage(
            error instanceof Error
              ? error.message
              : 'Unable to load profit/loss',
          )
        }
      })

    return () => {
      cancelled = true
    }
  }, [loadData])

  async function createStatement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage(null)

    if (!canMutate) {
      setMessage('Profit/loss calculation is restricted to finance reviewers.')
      return
    }

    try {
      await createProfitLossStatement<ProfitLossStatement>(
        scopedBody(session, {
          applicationId,
          revenue: revenue || undefined,
          costs: costs || undefined,
        }),
      )
      await refresh()
      setMessage('Profit/loss statement generated')
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Unable to generate profit/loss statement',
      )
    }
  }

  const summaries = statements.map(mapProfitLossStatement)

  return (
    <>
      <PageHeader eyebrow="Profit and loss" title="Profit/loss statements" />
      <section className="finance-review-hero">
        <div>
          <span>Reviewer basis</span>
          <h2>Ratio-based distribution, loss-classification aware</h2>
          <p>
            Profit/loss statements should be read as auditable project
            calculations. Positive realized profit may be distributed by the
            approved ratio; genuine loss and breach-related loss remain separate
            review outcomes.
          </p>
        </div>
        <div className="finance-review-hero__callout">
          <strong>FR-38 control</strong>
          <span>
            This screen must never calculate a guaranteed fixed return on
            capital. Any fixed-return-like term should be blocked for review.
          </span>
        </div>
      </section>
      <form
        className="form-grid finance-pl-create"
        onSubmit={(event) => void createStatement(event)}
      >
        <div>
          <h2>Generate statement</h2>
          <p>
            Use backend ledger totals by default. Overrides are for controlled
            review scenarios and should match linked evidence or authorized
            waiver decisions.
          </p>
        </div>
        <ApplicationSelector
          applications={applications}
          value={applicationId}
          onChange={setApplicationId}
        />
        <Field
          label="Revenue override"
          name="revenue"
          type="number"
          value={revenue}
          onChange={setRevenue}
        />
        <Field
          label="Cost override"
          name="costs"
          type="number"
          value={costs}
          onChange={setCosts}
        />
        <div className="form-actions">
          <button type="submit" disabled={!applications.length || !canMutate}>
            Generate statement
          </button>
          {message ? <p className="notice">{message}</p> : null}
          {!canMutate ? (
            <p className="notice">
              Read-only view. Statement generation is restricted to organization
              admins and financier users.
            </p>
          ) : null}
        </div>
      </form>

      <section className="table-section">
        <h2>Statement records</h2>
        {summaries.length ? (
          <div className="finance-pl-list">
            {summaries.map((summary, index) => {
              const sourceStatement = statements[index]
              const fixedReturnDetected = hasGuaranteedFixedReturnPattern({
                summary,
              })
              const lossExplanation = getLossTreatmentExplanation(summary)
              const statusTone =
                summary.status === 'loss_exception' ||
                summary.status === 'review_required'
                  ? 'finance-blocked-note'
                  : 'finance-safe-note'

              return (
                <article key={sourceStatement.id || summary.applicationId}>
                  <div className="finance-pl-header">
                    <div>
                      <strong>
                        {sourceStatement.application?.opportunity?.title ??
                          summary.applicationId}
                      </strong>
                      <span>{getProfitLossFinding(summary)}</span>
                    </div>
                    <StatusTag status={summary.status.toUpperCase()} />
                  </div>
                  <p className={statusTone}>{lossExplanation}</p>
                  <div className="finance-ledger-summary">
                    <article>
                      <span>Revenue</span>
                      <strong>
                        {formatCurrency(
                          summary.totalRevenue,
                          summary.currency,
                        )}
                      </strong>
                    </article>
                    <article>
                      <span>Allowed costs</span>
                      <strong>
                        {formatCurrency(
                          summary.totalAllowedCost,
                          summary.currency,
                        )}
                      </strong>
                    </article>
                    <article>
                      <span>Net</span>
                      <strong>
                        {formatCurrency(
                          summary.netProfitOrLoss,
                          summary.currency,
                        )}
                      </strong>
                    </article>
                    <article>
                      <span>Guaranteed return check</span>
                      <strong>
                        {fixedReturnDetected ? 'Blocked' : 'None detected'}
                      </strong>
                    </article>
                  </div>
                  <div className="finance-ratio-strip">
                    <article>
                      <span>Rabb-ul-Mal ratio</span>
                      <strong>
                        {formatProfitShareRatio(
                          summary.profitShareRatio.rabbUlMal,
                        )}
                      </strong>
                    </article>
                    <article>
                      <span>Mudarib ratio</span>
                      <strong>
                        {formatProfitShareRatio(
                          summary.profitShareRatio.mudarib,
                        )}
                      </strong>
                    </article>
                    <article>
                      <span>Loss treatment</span>
                      <strong>
                        {summary.netProfitOrLoss < 0
                          ? 'Exception review'
                          : 'Not triggered'}
                      </strong>
                    </article>
                  </div>
                  {summary.distribution ? (
                    <div className="finance-distribution-grid">
                      <article>
                        <span>Rabb-ul-Mal distribution</span>
                        <strong>
                          {formatCurrency(
                            summary.distribution.rabbUlMalAmount,
                            summary.currency,
                          )}
                        </strong>
                      </article>
                      <article>
                        <span>Mudarib distribution</span>
                        <strong>
                          {formatCurrency(
                            summary.distribution.mudaribAmount,
                            summary.currency,
                          )}
                        </strong>
                      </article>
                    </div>
                  ) : (
                    <p className="notice">
                      No profit distribution is shown because realized profit is
                      not positive. This avoids treating loss or break-even
                      outcomes as guaranteed financier return.
                    </p>
                  )}
                  {summary.lossExceptions.length ? (
                    <div className="finance-evidence-list">
                      <h3>Loss exception path</h3>
                      {summary.lossExceptions.map((exception) => (
                        <span key={exception.id || exception.exceptionType}>
                          {exception.exceptionType} ·{' '}
                          {formatCurrency(exception.amount, summary.currency)}
                        </span>
                      ))}
                    </div>
                  ) : summary.netProfitOrLoss < 0 ? (
                    <div className="finance-evidence-list">
                      <h3>Loss exception path</h3>
                      <span>
                        Pending classification: genuine commercial loss must be
                        separated from negligence, misconduct, fraud, or breach.
                      </span>
                    </div>
                  ) : null}
                </article>
              )
            })}
          </div>
        ) : (
          <EmptyNotice>No statements found.</EmptyNotice>
        )}
      </section>
    </>
  )
}

function ClosuresScreen({
  session,
  roleCodes,
}: {
  session: AppSession
  roleCodes: AppRoleCode[]
}) {
  const { listApplications } = useApplications(session)
  const { listClosures, createClosure: createClosureRecord } =
    useClosures(session)
  const [applications, setApplications] = useState<MudarabahApplication[]>([])
  const [closures, setClosures] = useState<ClosurePack[]>([])
  const [applicationId, setApplicationId] = useState(getQueryParam('applicationId'))
  const [confirmingExport, setConfirmingExport] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const canMutate = canOperateFinanceRecords(roleCodes)

  const loadData = useCallback(async () => {
    const [applicationRows, closureRows] = await Promise.all([
      listApplications<MudarabahApplication>(),
      listClosures<ClosurePack>(),
    ])

    return { applications: applicationRows, closures: closureRows }
  }, [listApplications, listClosures])

  async function refresh() {
    const data = await loadData()
    setApplications(data.applications)
    setClosures(data.closures)
  }

  useEffect(() => {
    let cancelled = false

    loadData()
      .then((data) => {
        if (!cancelled) {
          setApplications(data.applications)
          setClosures(data.closures)
          setApplicationId(
            (current) =>
              current ||
              data.applications.find(
                (app) => app.status === 'PROFIT_LOSS_CALCULATED',
              )?.id ||
              '',
          )
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setMessage(
            error instanceof Error ? error.message : 'Unable to load closures',
          )
        }
      })

    return () => {
      cancelled = true
    }
  }, [loadData])

  function requestClosureExport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!canMutate) {
      setMessage('Closure export is restricted to finance reviewers.')
      return
    }

    setConfirmingExport(true)
  }

  async function createClosure() {
    setConfirmingExport(false)
    setMessage(null)

    try {
      await createClosureRecord<ClosurePack>(
        scopedBody(session, {
          applicationId,
        }),
      )
      await refresh()
      setMessage('Closure pack exported')
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Unable to export closure pack',
      )
    }
  }

  return (
    <>
      <PageHeader eyebrow="Closure pack" title="Closures" />
      <form
        className="form-grid"
        onSubmit={requestClosureExport}
      >
        <h2>Export closure</h2>
        <ApplicationSelector
          applications={applications}
          value={applicationId}
          onChange={setApplicationId}
        />
        <div className="form-actions">
          <button type="submit" disabled={!applications.length || !canMutate}>
            Export closure
          </button>
          {message ? <p className="notice">{message}</p> : null}
          {!canMutate ? (
            <p className="notice">
              Read-only view. Closure export is restricted to organization
              admins and financier users.
            </p>
          ) : null}
        </div>
      </form>

      <ConfirmDialog
        open={confirmingExport}
        title="Export closure pack?"
        message="This records the closure pack state for the application. Continue only when the finance record is ready to close."
        confirmLabel="Confirm export"
        onCancel={() => setConfirmingExport(false)}
        onConfirm={() => void createClosure()}
      />

      <section className="table-section">
        <h2>Closure records</h2>
        {closures.length ? (
          <div className="data-table data-table--closure">
            {closures.map((closure) => (
              <article key={closure.id}>
                <div>
                  <strong>
                    {closure.application?.opportunity?.title ??
                      closure.applicationId}
                  </strong>
                  <span>
                    {closure.evidencePack?.title ??
                      'Evidence pack not attached'}
                  </span>
                </div>
                <StatusTag
                  status={closure.application?.status || closure.status || 'CLOSED'}
                />
                <span>Pack status {closure.status || 'EXPORTED'}</span>
                <span>
                  Latest P/L{' '}
                  {closure.application?.profitLossStatements?.[0]?.id ??
                    'not included in response'}
                </span>
                <span>{formatDateTime(closure.exportedAt)}</span>
              </article>
            ))}
          </div>
        ) : (
          <EmptyNotice>No closure packs found.</EmptyNotice>
        )}
      </section>
    </>
  )
}

function PickedApplicationRoute({
  session,
  roleCodes,
}: {
  session: AppSession
  roleCodes: AppRoleCode[]
}) {
  const { applicationId: routeApplicationId } = useParams()
  const { workspaceTab } = useParams()
  const applicationId = useMemo(() => {
    return routeApplicationId || getQueryParam('applicationId')
  }, [routeApplicationId])

  if (!applicationId) {
    return <EmptyNotice>No application selected.</EmptyNotice>
  }

  return (
    <ApplicationDetailScreen
      session={session}
      applicationId={applicationId}
      workspaceTab={workspaceTab}
      roleCodes={roleCodes}
    />
  )
}

export function FinanceRoute({
  session,
  navigate,
}: FinanceRouteProps) {
  const { authorization } = useAuth()
  const roleCodes = authorization.roleCodes

  return (
    <Routes>
      <Route
        path="opportunities"
        element={
          <OpportunitiesScreen
            session={session}
            navigate={navigate}
            roleCodes={roleCodes}
          />
        }
      />
      <Route
        path="opportunities/new"
        element={
          <OpportunitiesScreen
            session={session}
            navigate={navigate}
            roleCodes={roleCodes}
          />
        }
      />
      <Route
        path="applications"
        element={
          <ApplicationsScreen
            session={session}
            navigate={navigate}
            roleCodes={roleCodes}
          />
        }
      />
      <Route
        path="applications/:applicationId"
        element={
          <PickedApplicationRoute session={session} roleCodes={roleCodes} />
        }
      />
      <Route
        path="applications/:applicationId/:workspaceTab"
        element={
          <PickedApplicationRoute session={session} roleCodes={roleCodes} />
        }
      />
      <Route path="contracts" element={<ContractsScreen session={session} />} />
      <Route
        path="ledgers"
        element={<LedgersScreen session={session} roleCodes={roleCodes} />}
      />
      <Route
        path="profit-loss"
        element={<ProfitLossScreen session={session} roleCodes={roleCodes} />}
      />
      <Route
        path="closures"
        element={<ClosuresScreen session={session} roleCodes={roleCodes} />}
      />
      <Route path="*" element={null} />
    </Routes>
  )
}
