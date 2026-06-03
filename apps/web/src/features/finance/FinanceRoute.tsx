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
import { ApplicationsPage } from './applications/ApplicationsPage'
import { ApplicationWorkspacePage } from './applications/workspace/ApplicationWorkspacePage'
import {
  calculateProfitLossSummary,
  displayLedgerEntryType,
  getProfitLossFinding,
  hasGuaranteedFixedReturnPattern,
  mapLedgerEntry,
  mapProfitLossStatement,
} from './ledger/ledger.model'
import { OpportunitiesPage } from './opportunities/OpportunitiesPage'

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
  exceptionType: string
  amount: number
  notes?: string | null
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
    <ApplicationWorkspacePage
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
  const showOverview = selectedTab === 'overview'
  const showEvidence = showOverview || selectedTab === 'evidence'
  const showDueDiligence = showOverview || selectedTab === 'due-diligence'
  const showShariah = showOverview || selectedTab === 'shariah-review'
  const showContract = showOverview || selectedTab === 'contract'
  const showDisbursement = showOverview || selectedTab === 'disbursement'
  const showLedger = showOverview || selectedTab === 'ledger'
  const showProfitLoss = showOverview || selectedTab === 'profit-loss'
  const showClosure = showOverview || selectedTab === 'closure'
  const showAudit = showOverview || selectedTab === 'audit'

  return (
    <>
      <PageHeader eyebrow="Mudarabah workflow" title="Application workspace" />
      {state.status === 'loading' ? (
        <EmptyNotice>Loading application...</EmptyNotice>
      ) : null}
      {state.status === 'error' ? (
        <p className="error-text">{state.message}</p>
      ) : null}
      {message ? <p className="notice">{message}</p> : null}
      {application ? (
        <>
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
          <section className="details-grid finance-details">
            <article>
              <span>Opportunity</span>
              <strong>{application.opportunity?.title ?? application.opportunityId}</strong>
            </article>
            <article>
              <span>Status</span>
              <strong>{application.status}</strong>
            </article>
            <article>
              <span>Capital</span>
              <strong>
                {formatCurrency(application.requestedCapital, application.currency)}
              </strong>
            </article>
            <article>
              <span>Evidence checklist</span>
              <strong>{checklist?.status ?? 'Not generated'}</strong>
            </article>
            <article>
              <span>Role context</span>
              <strong>{roleCodes.join(', ') || 'No assigned role'}</strong>
            </article>
          </section>
          <section className="table-section">
            <h2>Lifecycle</h2>
            <FinanceLifecycleTrack status={application.status} />
          </section>
          {roleScope.isAuditor ? (
            <p className="notice">
              Auditor workspace is read-only: evidence, audit, hashes, and closure
              state are visible, while finance mutations stay unavailable.
            </p>
          ) : null}
          <section className="split-grid">
            {showEvidence ? (
            <form className="form-grid">
              <h2>Evidence</h2>
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
                    <button
                      type="button"
                      disabled={!checklist?.items?.length}
                      onClick={() => void completeChecklist(checklist?.items ?? [])}
                    >
                      Complete items
                    </button>
                  </>
                ) : (
                  <span>Read-only evidence review</span>
                )}
              </div>
              {checklist?.items?.length ? (
                <div className="data-table data-table--checklist">
                  {checklist.items.map((item) => (
                    <article key={item.id}>
                      <strong>{item.label}</strong>
                      <span>{item.requiredCode}</span>
                      <StatusTag status={item.status} />
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyNotice>No checklist generated.</EmptyNotice>
              )}
            </form>
            ) : null}
            {showDueDiligence || showShariah ? (
            <form className="form-grid">
              <h2>Reviews</h2>
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
              </div>
              <div className="data-table data-table--checklist">
                <article>
                  <strong>Due diligence</strong>
                  <span>{latestDueDiligence?.riskRating ?? 'Pending'}</span>
                  <StatusTag status={latestDueDiligence?.status ?? 'PENDING'} />
                </article>
                <article>
                  <strong>Shariah review</strong>
                  <span>{latestShariahReview?.decision ?? 'Pending'}</span>
                  <StatusTag status={latestShariahReview?.status ?? 'PENDING'} />
                </article>
              </div>
            </form>
            ) : null}
            {showContract ? (
              <form
                className="form-grid"
                onSubmit={(event) => void createContractForApplication(event)}
              >
                <h2>Contract</h2>
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
                      <button
                        type="button"
                        disabled={latestContract?.status !== 'PENDING_SIGNATURE'}
                        onClick={() =>
                          latestContract ? void markSigned(latestContract.id) : undefined
                        }
                      >
                        Mark signed
                      </button>
                    </>
                  ) : (
                    <span>Contract terms are read-only for this role.</span>
                  )}
                </div>
                <div className="data-table data-table--checklist">
                  <article>
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
                className="form-grid"
                onSubmit={(event) => void recordDisbursement(event)}
              >
                <h2>Disbursement</h2>
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
                <div className="data-table data-table--checklist">
                  <article>
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
              <form className="form-grid" onSubmit={(event) => void recordLedgerEntry(event)}>
                <h2>Ledger</h2>
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
                className="form-grid"
                onSubmit={(event) => void generateProfitLoss(event)}
              >
                <h2>Profit/Loss</h2>
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
                <div className="data-table data-table--checklist">
                  <article>
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
              <section className="form-grid">
                <h2>Closure</h2>
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
                <div className="data-table data-table--checklist">
                  <article>
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
            {showAudit ? (
              <section className="form-grid">
                <h2>Audit</h2>
                <p className="notice">
                  Audit timeline links back to this application and the procurement
                  opportunity. Reviewers can use it to verify approvals, contract
                  state, ledger events, and closure export.
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

  return (
    <>
      <PageHeader eyebrow="Project ledger" title="Ledger entries" />
      <section className="finance-ledger-summary" aria-label="Preliminary profit and loss">
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
          <h2>Distribution preview</h2>
          <p>{getProfitLossFinding(preliminarySummary)}</p>
          <dl>
            <div>
              <dt>Rabb-ul-Mal ratio</dt>
              <dd>{preliminarySummary.profitShareRatio.rabbUlMal}</dd>
            </div>
            <div>
              <dt>Mudarib ratio</dt>
              <dd>{preliminarySummary.profitShareRatio.mudarib}</dd>
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
            No fixed return is calculated. Distribution appears only when
            realized project profit is positive.
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
        <h2>Ledger records</h2>
        {selectedEntries.length ? (
          <div className="data-table data-table--ledger">
            {selectedEntries.map((entry) => (
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
      <form
        className="form-grid"
        onSubmit={(event) => void createStatement(event)}
      >
        <h2>Generate statement</h2>
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
                      <span>Fixed return check</span>
                      <strong>{fixedReturnDetected ? 'Blocked' : 'Clear'}</strong>
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
                      not positive.
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
                <StatusTag status={closure.status || 'CLOSED'} />
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
