import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'

type AppSession = {
  organizationId: string | null
  actorUserId: string | null
}

type FinanceRouteProps = {
  path: string
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
  createdAt: string
  distributions?: ProfitDistribution[]
  lossExceptions?: LossException[]
  application?: MudarabahApplication | null
}

type ClosurePack = {
  id: string
  applicationId: string
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

type LoadState<T> =
  | { status: 'loading' }
  | { status: 'ready'; data: T }
  | { status: 'error'; message: string }

const apiBaseUrl =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1'

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

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || `Request failed with ${response.status}`)
  }

  return (await response.json()) as T
}

function organizationQuery(session: AppSession) {
  if (!session.organizationId) {
    throw new Error('Create an organization first')
  }

  return `organizationId=${encodeURIComponent(session.organizationId)}`
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

function formatMoney(value?: number | null, currency = 'MYR') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value ?? 0)
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
  return (
    <header className="page-header">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
      </div>
      {action}
    </header>
  )
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
    <label className="field">
      <span>{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}

function EmptyNotice({ children }: { children: ReactNode }) {
  return <p className="notice">{children}</p>
}

function StatusTag({ status }: { status: string }) {
  return <span className={`status-tag status-tag--${status}`}>{status}</span>
}

function FinanceLifecycleTrack({ status }: { status: string }) {
  const currentIndex = financeLifecycleStates.indexOf(status)

  return (
    <div className="lifecycle-track lifecycle-track--finance">
      {currentIndex === -1 ? (
        <span className="active">{status}</span>
      ) : (
        financeLifecycleStates.map((state, index) => (
          <span key={state} className={index <= currentIndex ? 'active' : ''}>
            {state}
          </span>
        ))
      )}
    </div>
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
    if (!session.organizationId) {
      return { projects: [], purchaseOrders: [], evidencePacks: [], opportunities: [] }
    }

    const query = organizationQuery(session)
    const [projectRows, purchaseOrderRows, packRows, opportunityRows] =
      await Promise.all([
        apiRequest<Project[]>(`/projects?${query}`),
        apiRequest<PurchaseOrder[]>(`/purchase-orders?${query}`),
        apiRequest<EvidencePack[]>(`/evidence-packs?${query}`),
        apiRequest<Opportunity[]>(`/opportunities?${query}`),
      ])

    return {
      projects: projectRows,
      purchaseOrders: purchaseOrderRows,
      evidencePacks: packRows,
      opportunities: opportunityRows,
    }
  }, [session])

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
      await apiRequest<Opportunity>('/opportunities', {
        method: 'POST',
        body: JSON.stringify(
          scopedBody(session, {
            projectId,
            purchaseOrderId: purchaseOrderId || undefined,
            evidencePackId: evidencePackId || undefined,
            title,
            estimatedCapital,
            expectedProfit,
            currency: 'MYR',
          }),
        ),
      })
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
                  {formatMoney(opportunity.estimatedCapital, opportunity.currency)}
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
}: {
  session: AppSession
  navigate: (path: string) => void
}) {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [applications, setApplications] = useState<MudarabahApplication[]>([])
  const [opportunityId, setOpportunityId] = useState('')
  const [requestedCapital, setRequestedCapital] = useState('12000')
  const [capitalProviderRatio, setCapitalProviderRatio] = useState('0.6')
  const [entrepreneurRatio, setEntrepreneurRatio] = useState('0.4')
  const [message, setMessage] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!session.organizationId) {
      return { opportunities: [], applications: [] }
    }

    const query = organizationQuery(session)
    const [opportunityRows, applicationRows] = await Promise.all([
      apiRequest<Opportunity[]>(`/opportunities?${query}`),
      apiRequest<MudarabahApplication[]>(`/applications?${query}`),
    ])

    return { opportunities: opportunityRows, applications: applicationRows }
  }, [session])

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
      const created = await apiRequest<MudarabahApplication>('/applications', {
        method: 'POST',
        body: JSON.stringify(
          scopedBody(session, {
            opportunityId,
            applicantUserId: session.actorUserId,
            requestedCapital,
            capitalProviderRatio,
            entrepreneurRatio,
            currency: 'MYR',
          }),
        ),
      })
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
      await apiRequest<MudarabahApplication>(`/applications/${id}/submit`, {
        method: 'POST',
        body: JSON.stringify({ actorUserId: session.actorUserId }),
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

      <section className="table-section">
        <h2>Application records</h2>
        {applications.length ? (
          <div className="data-table data-table--finance-lifecycle">
            {applications.map((application) => (
              <article key={application.id}>
                <div>
                  <strong>{application.opportunity?.title ?? application.id}</strong>
                  <span>
                    {formatMoney(application.requestedCapital, application.currency)}
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
}: {
  session: AppSession
  applicationId: string
}) {
  const [state, setState] = useState<LoadState<MudarabahApplication>>({
    status: 'loading',
  })
  const [message, setMessage] = useState<string | null>(null)

  const loadApplication = useCallback(
    () => apiRequest<MudarabahApplication>(`/applications/${applicationId}`),
    [applicationId],
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
    path: string,
    body: Record<string, unknown> = {},
  ) {
    setMessage(null)

    try {
      await apiRequest<unknown>(path, {
        method: 'POST',
        body: JSON.stringify({
          actorUserId: session.actorUserId,
          ...body,
        }),
      })
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
            apiRequest<ChecklistItem>(`/evidence-checklists/${item.id}/complete-item`, {
              method: 'POST',
              body: JSON.stringify({
                actorUserId: session.actorUserId,
              }),
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

  const application = state.status === 'ready' ? state.data : null
  const checklist = application?.evidenceChecklist
  const latestDueDiligence = application?.dueDiligenceReports?.[0]
  const latestShariahReview = application?.shariahReviews?.[0]

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
                {formatMoney(application.requestedCapital, application.currency)}
              </strong>
            </article>
            <article>
              <span>Evidence checklist</span>
              <strong>{checklist?.status ?? 'Not generated'}</strong>
            </article>
          </section>
          <section className="table-section">
            <h2>Lifecycle</h2>
            <FinanceLifecycleTrack status={application.status} />
          </section>
          <section className="split-grid">
            <form className="form-grid">
              <h2>Evidence</h2>
              <div className="form-actions">
                <button
                  type="button"
                  disabled={!['SUBMITTED', 'EVIDENCE_PENDING'].includes(application.status)}
                  onClick={() =>
                    void runAction(
                      'Checklist generated',
                      `/applications/${application.id}/evidence-checklist`,
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
            <form className="form-grid">
              <h2>Reviews</h2>
              <div className="form-actions">
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
                      `/applications/${application.id}/due-diligence`,
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
                <button
                  type="button"
                  disabled={
                    latestDueDiligence?.status !== 'APPROVED' ||
                    latestShariahReview?.status === 'APPROVED'
                  }
                  onClick={() =>
                    void runAction(
                      'Shariah review approved',
                      `/applications/${application.id}/shariah-review`,
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
                      `/applications/${application.id}/approve`,
                    )
                  }
                >
                  Approve application
                </button>
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
          </section>
        </>
      ) : null}
    </>
  )
}

function ContractsScreen({ session }: { session: AppSession }) {
  const [applications, setApplications] = useState<MudarabahApplication[]>([])
  const [contracts, setContracts] = useState<Contract[]>([])
  const [applicationId, setApplicationId] = useState(getQueryParam('applicationId'))
  const [restrictedUse, setRestrictedUse] = useState(
    'Restricted to approved procurement project costs only',
  )
  const [message, setMessage] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!session.organizationId) {
      return { applications: [], contracts: [] }
    }

    const query = organizationQuery(session)
    const [applicationRows, contractRows] = await Promise.all([
      apiRequest<MudarabahApplication[]>(`/applications?${query}`),
      apiRequest<Contract[]>(`/contracts?${query}`),
    ])

    return { applications: applicationRows, contracts: contractRows }
  }, [session])

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
      await apiRequest<Contract>('/contracts', {
        method: 'POST',
        body: JSON.stringify(
          scopedBody(session, {
            applicationId,
            restrictedUse,
          }),
        ),
      })
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
      await apiRequest<Contract>(`/contracts/${id}/mark-signed`, {
        method: 'POST',
        body: JSON.stringify({ actorUserId: session.actorUserId }),
      })
      await refresh()
      setMessage('Contract signed')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to sign contract')
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
  const [applications, setApplications] = useState<MudarabahApplication[]>([])
  const [entries, setEntries] = useState<LedgerEntry[]>([])
  const [applicationId, setApplicationId] = useState(getQueryParam('applicationId'))
  const [entryType, setEntryType] = useState('REVENUE')
  const [description, setDescription] = useState('Project revenue recorded')
  const [amount, setAmount] = useState('14000')
  const [message, setMessage] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!session.organizationId) {
      return { applications: [], entries: [] }
    }

    const query = organizationQuery(session)
    const [applicationRows, entryRows] = await Promise.all([
      apiRequest<MudarabahApplication[]>(`/applications?${query}`),
      apiRequest<LedgerEntry[]>(`/project-ledgers/entries?${query}`),
    ])

    return { applications: applicationRows, entries: entryRows }
  }, [session])

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
      await apiRequest<LedgerEntry>('/project-ledgers/entries', {
        method: 'POST',
        body: JSON.stringify(
          scopedBody(session, {
            applicationId,
            entryType,
            description,
            amount,
            currency: 'MYR',
          }),
        ),
      })
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
                <span>{formatMoney(entry.amount, entry.currency)}</span>
                <span>{new Date(entry.occurredAt).toLocaleString()}</span>
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
  const [applications, setApplications] = useState<MudarabahApplication[]>([])
  const [statements, setStatements] = useState<ProfitLossStatement[]>([])
  const [applicationId, setApplicationId] = useState(getQueryParam('applicationId'))
  const [revenue, setRevenue] = useState('')
  const [costs, setCosts] = useState('')
  const [message, setMessage] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!session.organizationId) {
      return { applications: [], statements: [] }
    }

    const query = organizationQuery(session)
    const [applicationRows, statementRows] = await Promise.all([
      apiRequest<MudarabahApplication[]>(`/applications?${query}`),
      apiRequest<ProfitLossStatement[]>(`/profit-loss/statements?${query}`),
    ])

    return { applications: applicationRows, statements: statementRows }
  }, [session])

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
      await apiRequest<ProfitLossStatement>('/profit-loss/statements', {
        method: 'POST',
        body: JSON.stringify(
          scopedBody(session, {
            applicationId,
            revenue: revenue || undefined,
            costs: costs || undefined,
          }),
        ),
      })
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
                <span>Revenue {formatMoney(statement.revenue)}</span>
                <span>Costs {formatMoney(statement.costs)}</span>
                <span>Net {formatMoney(statement.netProfit)}</span>
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
  const [applications, setApplications] = useState<MudarabahApplication[]>([])
  const [closures, setClosures] = useState<ClosurePack[]>([])
  const [applicationId, setApplicationId] = useState(getQueryParam('applicationId'))
  const [message, setMessage] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!session.organizationId) {
      return { applications: [], closures: [] }
    }

    const query = organizationQuery(session)
    const [applicationRows, closureRows] = await Promise.all([
      apiRequest<MudarabahApplication[]>(`/applications?${query}`),
      apiRequest<ClosurePack[]>(`/closures?${query}`),
    ])

    return { applications: applicationRows, closures: closureRows }
  }, [session])

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

  async function createClosure(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage(null)

    try {
      await apiRequest<ClosurePack>('/closures', {
        method: 'POST',
        body: JSON.stringify(
          scopedBody(session, {
            applicationId,
          }),
        ),
      })
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
        onSubmit={(event) => void createClosure(event)}
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
                <span>{new Date(closure.exportedAt).toLocaleString()}</span>
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
  path,
  session,
}: {
  path: string
  session: AppSession
}) {
  const applicationId = useMemo(() => {
    const [, , , routeApplicationId] = path.split('/')
    return routeApplicationId || getQueryParam('applicationId')
  }, [path])

  if (!applicationId) {
    return <EmptyNotice>No application selected.</EmptyNotice>
  }

  return (
    <ApplicationDetailScreen session={session} applicationId={applicationId} />
  )
}

export function FinanceRoute({
  path,
  session,
  navigate,
}: FinanceRouteProps) {
  if (path === '/finance/opportunities' || path === '/finance/opportunities/new') {
    return <OpportunitiesScreen session={session} navigate={navigate} />
  }

  if (path === '/finance/applications') {
    return <ApplicationsScreen session={session} navigate={navigate} />
  }

  if (path.startsWith('/finance/applications/')) {
    return <PickedApplicationRoute path={path} session={session} />
  }

  if (path === '/finance/contracts') {
    return <ContractsScreen session={session} />
  }

  if (path === '/finance/ledgers') {
    return <LedgersScreen session={session} />
  }

  if (path === '/finance/profit-loss') {
    return <ProfitLossScreen session={session} />
  }

  if (path === '/finance/closures') {
    return <ClosuresScreen session={session} />
  }

  return null
}
