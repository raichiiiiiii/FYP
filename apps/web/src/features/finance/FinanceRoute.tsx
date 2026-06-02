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
import { useEvidencePacks } from '../evidence/api/useEvidencePacks'
import { useProjects } from '../procurement/api/useProjects'
import { usePurchaseOrders } from '../procurement/api/usePurchaseOrders'
import { useApplications } from './api/useApplications'
import { useClosures } from './api/useClosures'
import { useContracts } from './api/useContracts'
import { useDisbursements } from './api/useDisbursements'
import { useLedgers } from './api/useLedgers'
import { useOpportunities } from './api/useOpportunities'
import { useProfitLoss } from './api/useProfitLoss'

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

function OpportunitySelector({
  opportunities,
  value,
  onChange,
}: {
  opportunities: Opportunity[]
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="field">
      <span>Opportunity</span>
      <select
        required
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">Select opportunity</option>
        {opportunities.map((opportunity) => (
          <option key={opportunity.id} value={opportunity.id}>
            {opportunity.title}
          </option>
        ))}
      </select>
    </label>
  )
}

function OpportunitiesScreen({
  session,
  navigate,
}: {
  session: AppSession
  navigate: (path: string) => void
}) {
  const { listProjects } = useProjects(session)
  const { listPurchaseOrders } = usePurchaseOrders(session)
  const { listEvidencePacks } = useEvidencePacks(session)
  const { listOpportunities, createOpportunity: createOpportunityRecord } =
    useOpportunities(session)
  const [projects, setProjects] = useState<Project[]>([])
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
  const [evidencePacks, setEvidencePacks] = useState<EvidencePack[]>([])
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [projectId, setProjectId] = useState('')
  const [purchaseOrderId, setPurchaseOrderId] = useState('')
  const [evidencePackId, setEvidencePackId] = useState('')
  const [title, setTitle] = useState('Restricted working capital opportunity')
  const [estimatedCapital, setEstimatedCapital] = useState('12000')
  const [expectedProfit, setExpectedProfit] = useState('1800')
  const [message, setMessage] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    const [projectRows, purchaseOrderRows, packRows, opportunityRows] =
      await Promise.all([
        listProjects<Project>(),
        listPurchaseOrders<PurchaseOrder>(),
        listEvidencePacks<EvidencePack>(),
        listOpportunities<Opportunity>(),
      ])

    return {
      projects: projectRows,
      purchaseOrders: purchaseOrderRows,
      evidencePacks: packRows,
      opportunities: opportunityRows,
    }
  }, [listEvidencePacks, listOpportunities, listProjects, listPurchaseOrders])

  async function refresh() {
    const data = await loadData()
    setProjects(data.projects)
    setPurchaseOrders(data.purchaseOrders)
    setEvidencePacks(data.evidencePacks)
    setOpportunities(data.opportunities)
  }

  useEffect(() => {
    let cancelled = false

    loadData()
      .then((data) => {
        if (!cancelled) {
          setProjects(data.projects)
          setPurchaseOrders(data.purchaseOrders)
          setEvidencePacks(data.evidencePacks)
          setOpportunities(data.opportunities)
          setProjectId((current) => current || data.projects[0]?.id || '')
          setPurchaseOrderId(
            (current) =>
              current ||
              data.purchaseOrders.find((po) => po.status === 'INVOICED')?.id ||
              data.purchaseOrders[0]?.id ||
              '',
          )
          setEvidencePackId((current) => current || data.evidencePacks[0]?.id || '')
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setMessage(
            error instanceof Error
              ? error.message
              : 'Unable to load finance opportunities',
          )
        }
      })

    return () => {
      cancelled = true
    }
  }, [loadData])

  async function createOpportunity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage(null)

    try {
      await createOpportunityRecord<Opportunity>(
        scopedBody(session, {
          projectId,
          purchaseOrderId: purchaseOrderId || undefined,
          evidencePackId: evidencePackId || undefined,
          title,
          estimatedCapital,
          expectedProfit,
          currency: 'MYR',
        }),
      )
      await refresh()
      setMessage('Opportunity created')
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Unable to create opportunity',
      )
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Mudarabah finance"
        title="Procurement opportunities"
        action={
          <button type="button" onClick={() => navigate('/finance/applications')}>
            Applications
          </button>
        }
      />
      <form
        className="form-grid"
        onSubmit={(event) => void createOpportunity(event)}
      >
        <h2>Create opportunity</h2>
        <label className="field">
          <span>Project</span>
          <select
            required
            value={projectId}
            onChange={(event) => setProjectId(event.target.value)}
          >
            <option value="">Select project</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Purchase order</span>
          <select
            value={purchaseOrderId}
            onChange={(event) => setPurchaseOrderId(event.target.value)}
          >
            <option value="">No purchase order</option>
            {purchaseOrders.map((purchaseOrder) => (
              <option key={purchaseOrder.id} value={purchaseOrder.id}>
                {purchaseOrder.poNumber} - {purchaseOrder.status}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Evidence pack</span>
          <select
            value={evidencePackId}
            onChange={(event) => setEvidencePackId(event.target.value)}
          >
            <option value="">No evidence pack</option>
            {evidencePacks.map((pack) => (
              <option key={pack.id} value={pack.id}>
                {pack.title}
              </option>
            ))}
          </select>
        </label>
        <Field label="Title" name="title" required value={title} onChange={setTitle} />
        <Field
          label="Estimated capital"
          name="estimatedCapital"
          type="number"
          required
          value={estimatedCapital}
          onChange={setEstimatedCapital}
        />
        <Field
          label="Expected profit"
          name="expectedProfit"
          type="number"
          value={expectedProfit}
          onChange={setExpectedProfit}
        />
        <div className="form-actions">
          <button type="submit" disabled={!projects.length}>
            Create opportunity
          </button>
          {message ? <p className="notice">{message}</p> : null}
        </div>
      </form>

      <section className="table-section">
        <h2>Opportunity records</h2>
        {opportunities.length ? (
          <div className="data-table data-table--finance">
            {opportunities.map((opportunity) => (
              <article key={opportunity.id}>
                <strong>{opportunity.title}</strong>
                <span>{opportunity.project?.name ?? 'No project'}</span>
                <StatusTag status={opportunity.status} />
                <span>
                  {formatCurrency(opportunity.estimatedCapital, opportunity.currency)}
                </span>
              </article>
            ))}
          </div>
        ) : (
          <EmptyNotice>No finance opportunities found.</EmptyNotice>
        )}
      </section>
    </>
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
  const { listOpportunities } = useOpportunities(session)
  const {
    listApplications,
    createApplication: createApplicationRecord,
    submitApplication: submitApplicationRecord,
  } = useApplications(session)
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [applications, setApplications] = useState<MudarabahApplication[]>([])
  const [opportunityId, setOpportunityId] = useState('')
  const [requestedCapital, setRequestedCapital] = useState('12000')
  const [capitalProviderRatio, setCapitalProviderRatio] = useState('0.6')
  const [entrepreneurRatio, setEntrepreneurRatio] = useState('0.4')
  const [message, setMessage] = useState<string | null>(null)
  const canCreateApplication = roleCodes.some((roleCode) =>
    ['ORG_ADMIN', 'FINANCIER_USER'].includes(roleCode),
  )

  const loadData = useCallback(async () => {
    const [opportunityRows, applicationRows] = await Promise.all([
      listOpportunities<Opportunity>(),
      listApplications<MudarabahApplication>(),
    ])

    return { opportunities: opportunityRows, applications: applicationRows }
  }, [listApplications, listOpportunities])

  async function refresh() {
    const data = await loadData()
    setOpportunities(data.opportunities)
    setApplications(data.applications)
  }

  useEffect(() => {
    let cancelled = false

    loadData()
      .then((data) => {
        if (!cancelled) {
          setOpportunities(data.opportunities)
          setApplications(data.applications)
          setOpportunityId(
            (current) => current || data.opportunities[0]?.id || '',
          )
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setMessage(
            error instanceof Error ? error.message : 'Unable to load applications',
          )
        }
      })

    return () => {
      cancelled = true
    }
  }, [loadData])

  async function createApplication(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage(null)

    try {
      const created = await createApplicationRecord<MudarabahApplication>(
        scopedBody(session, {
          opportunityId,
          applicantUserId: session.actorUserId,
          requestedCapital,
          capitalProviderRatio,
          entrepreneurRatio,
          currency: 'MYR',
        }),
      )
      await refresh()
      setMessage('Application created')
      navigate(`/finance/applications/${created.id}`)
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Unable to create application',
      )
    }
  }

  async function submitApplication(id: string) {
    setMessage(null)

    try {
      await submitApplicationRecord<MudarabahApplication>(id, {
        actorUserId: session.actorUserId,
      })
      await refresh()
      setMessage('Application submitted')
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Unable to submit application',
      )
    }
  }

  return (
    <>
      <PageHeader eyebrow="Mudarabah finance" title="Capital applications" />
      {!canCreateApplication ? (
        <p className="notice">
          This role can review application status, evidence, and assigned review
          workspaces. Application creation is reserved for finance operators.
        </p>
      ) : null}
      {canCreateApplication ? (
      <form
        className="form-grid"
        onSubmit={(event) => void createApplication(event)}
      >
        <h2>Create application</h2>
        <OpportunitySelector
          opportunities={opportunities}
          value={opportunityId}
          onChange={setOpportunityId}
        />
        <Field
          label="Requested capital"
          name="requestedCapital"
          type="number"
          required
          value={requestedCapital}
          onChange={setRequestedCapital}
        />
        <Field
          label="Capital provider ratio"
          name="capitalProviderRatio"
          type="number"
          required
          value={capitalProviderRatio}
          onChange={setCapitalProviderRatio}
        />
        <Field
          label="Entrepreneur ratio"
          name="entrepreneurRatio"
          type="number"
          required
          value={entrepreneurRatio}
          onChange={setEntrepreneurRatio}
        />
        <div className="form-actions">
          <button type="submit" disabled={!opportunities.length}>
            Create application
          </button>
          {message ? <p className="notice">{message}</p> : null}
        </div>
      </form>
      ) : message ? (
        <p className="notice">{message}</p>
      ) : null}

      <section className="table-section">
        <h2>Application records</h2>
        {applications.length ? (
          <div className="data-table data-table--finance-lifecycle">
            {applications.map((application) => (
              <article key={application.id}>
                <div>
                  <strong>{application.opportunity?.title ?? application.id}</strong>
                  <span>
                    {formatCurrency(application.requestedCapital, application.currency)}
                  </span>
                </div>
                <StatusTag status={application.status} />
                <FinanceLifecycleTrack status={application.status} />
                <div className="inline-actions">
                  <button
                    type="button"
                    disabled={application.status !== 'DRAFT'}
                    onClick={() => void submitApplication(application.id)}
                  >
                    Submit
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate(`/finance/applications/${application.id}`)}
                  >
                    Open
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyNotice>No applications found.</EmptyNotice>
        )}
      </section>
    </>
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

function LedgersScreen({ session }: { session: AppSession }) {
  const { listApplications } = useApplications(session)
  const { listLedgerEntries, createLedgerEntry } = useLedgers(session)
  const [applications, setApplications] = useState<MudarabahApplication[]>([])
  const [entries, setEntries] = useState<LedgerEntry[]>([])
  const [applicationId, setApplicationId] = useState(getQueryParam('applicationId'))
  const [entryType, setEntryType] = useState('REVENUE')
  const [description, setDescription] = useState('Project revenue recorded')
  const [amount, setAmount] = useState('14000')
  const [message, setMessage] = useState<string | null>(null)

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

  return (
    <>
      <PageHeader eyebrow="Project ledger" title="Ledger entries" />
      <form className="form-grid" onSubmit={(event) => void createEntry(event)}>
        <h2>Record entry</h2>
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
            <option value="REVENUE">Revenue</option>
            <option value="COST">Cost</option>
            <option value="EXPENSE">Expense</option>
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
          <button type="submit" disabled={!applications.length}>
            Record entry
          </button>
          {message ? <p className="notice">{message}</p> : null}
        </div>
      </form>

      <section className="table-section">
        <h2>Ledger records</h2>
        {entries.length ? (
          <div className="data-table data-table--finance">
            {entries.map((entry) => (
              <article key={entry.id}>
                <strong>{entry.entryType}</strong>
                <span>{entry.description}</span>
                <span>{formatCurrency(entry.amount, entry.currency)}</span>
                <span>{formatDateTime(entry.occurredAt)}</span>
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

function ProfitLossScreen({ session }: { session: AppSession }) {
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
          <button type="submit" disabled={!applications.length}>
            Generate statement
          </button>
          {message ? <p className="notice">{message}</p> : null}
        </div>
      </form>

      <section className="table-section">
        <h2>Statement records</h2>
        {statements.length ? (
          <div className="data-table data-table--finance">
            {statements.map((statement) => (
              <article key={statement.id}>
                <strong>
                  {statement.application?.opportunity?.title ?? statement.applicationId}
                </strong>
                <span>Revenue {formatCurrency(statement.revenue)}</span>
                <span>Costs {formatCurrency(statement.costs)}</span>
                <span>Net {formatCurrency(statement.netProfit)}</span>
              </article>
            ))}
          </div>
        ) : (
          <EmptyNotice>No statements found.</EmptyNotice>
        )}
      </section>
    </>
  )
}

function ClosuresScreen({ session }: { session: AppSession }) {
  const { listApplications } = useApplications(session)
  const { listClosures, createClosure: createClosureRecord } =
    useClosures(session)
  const [applications, setApplications] = useState<MudarabahApplication[]>([])
  const [closures, setClosures] = useState<ClosurePack[]>([])
  const [applicationId, setApplicationId] = useState(getQueryParam('applicationId'))
  const [confirmingExport, setConfirmingExport] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

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
          <button type="submit" disabled={!applications.length}>
            Export closure
          </button>
          {message ? <p className="notice">{message}</p> : null}
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
          <div className="data-table data-table--finance">
            {closures.map((closure) => (
              <article key={closure.id}>
                <strong>
                  {closure.application?.opportunity?.title ?? closure.applicationId}
                </strong>
                <span>{closure.evidencePack?.title ?? 'No evidence pack'}</span>
                <StatusTag status="CLOSED" />
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
        element={<OpportunitiesScreen session={session} navigate={navigate} />}
      />
      <Route
        path="opportunities/new"
        element={<OpportunitiesScreen session={session} navigate={navigate} />}
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
      <Route path="ledgers" element={<LedgersScreen session={session} />} />
      <Route
        path="profit-loss"
        element={<ProfitLossScreen session={session} />}
      />
      <Route path="closures" element={<ClosuresScreen session={session} />} />
      <Route path="*" element={null} />
    </Routes>
  )
}
