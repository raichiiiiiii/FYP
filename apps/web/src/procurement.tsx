import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'

type AppSession = {
  organizationId: string | null
  actorUserId: string | null
}

type Project = {
  id: string
  name: string
  code?: string | null
  description?: string | null
  status: string
  budget?: number | null
  requisitions?: Pick<Requisition, 'id' | 'title' | 'status' | 'totalAmount'>[]
}

type Supplier = {
  id: string
  name: string
  email?: string | null
  phone?: string | null
  status: string
}

type RequisitionItem = {
  id: string
  description: string
  category?: string | null
  quantity: number
  unitPrice: number
}

type Requisition = {
  id: string
  organizationId: string
  title: string
  justification?: string | null
  status: string
  totalAmount: number
  createdAt: string
  project?: Pick<Project, 'id' | 'name' | 'code'> | null
  items?: RequisitionItem[]
  approvalRequests?: {
    id: string
    status: string
    decision?: string | null
  }[]
  rfqs?: RFQ[]
  purchaseOrders?: PurchaseOrder[]
}

type RFQItem = {
  id: string
  description: string
  quantity: number
  targetPrice?: number | null
}

type RFQ = {
  id: string
  requisitionId: string
  title: string
  status: string
  publishedAt?: string | null
  requisition?: Pick<Requisition, 'id' | 'title' | 'status' | 'totalAmount'>
  items?: RFQItem[]
  quotations?: Quotation[]
}

type QuotationItem = {
  id: string
  rfqItemId?: string | null
  description: string
  quantity: number
  unitPrice: number
}

type Quotation = {
  id: string
  rfqId: string
  supplierId: string
  status: string
  totalAmount: number
  receivedAt: string
  supplier?: Supplier
  rfq?: RFQ
  items?: QuotationItem[]
}

type PurchaseOrder = {
  id: string
  requisitionId: string
  quotationId?: string | null
  supplierId: string
  poNumber: string
  status: string
  totalAmount: number
  issuedAt?: string | null
  supplier?: Supplier
  requisition?: Pick<Requisition, 'id' | 'title' | 'status' | 'totalAmount'>
  items?: PurchaseOrderItem[]
  receipts?: Receipt[]
  invoices?: Invoice[]
}

type PurchaseOrderItem = {
  id: string
  description: string
  quantity: number
  unitPrice: number
}

type Receipt = {
  id: string
  purchaseOrderId: string
  status: string
  receivedAt: string
  notes?: string | null
}

type Invoice = {
  id: string
  purchaseOrderId: string
  invoiceNumber: string
  amount: number
  status: string
  issuedAt: string
}

type LoadState<T> =
  | { status: 'loading' }
  | { status: 'ready'; data: T }
  | { status: 'error'; message: string }

type ProcurementRouteProps = {
  path: string
  session: AppSession
  navigate: (path: string) => void
}

const apiBaseUrl =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1'

const lifecycleStates = [
  'DRAFT',
  'SUBMITTED',
  'APPROVED',
  'SOURCING',
  'AWARDED',
  'PO_ISSUED',
  'RECEIVED',
  'INVOICED',
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

function scopedBody(
  session: AppSession,
  body: Record<string, unknown> = {},
) {
  if (!session.organizationId) {
    throw new Error('Create an organization first')
  }

  return {
    organizationId: session.organizationId,
    actorUserId: session.actorUserId,
    ...body,
  }
}

function formatMoney(value?: number | null) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
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

function LifecycleTrack({ status }: { status: string }) {
  const currentIndex = lifecycleStates.indexOf(status)

  if (currentIndex === -1) {
    return (
      <div className="lifecycle-track">
        <span className="active">{status}</span>
      </div>
    )
  }

  return (
    <div className="lifecycle-track" aria-label={`Lifecycle status ${status}`}>
      {lifecycleStates.map((state, index) => (
        <span key={state} className={index <= currentIndex ? 'active' : ''}>
          {state}
        </span>
      ))}
    </div>
  )
}

async function loadScopedList<T>(path: string, session: AppSession) {
  if (!session.organizationId) {
    return []
  }

  return apiRequest<T[]>(`${path}?${organizationQuery(session)}`)
}

function ProjectsScreen({ session }: { session: AppSession }) {
  const [projects, setProjects] = useState<Project[]>([])
  const [name, setName] = useState('ERP rollout evidence pack')
  const [code, setCode] = useState('PRJ-MEPN-001')
  const [budget, setBudget] = useState('15000')
  const [message, setMessage] = useState<string | null>(null)

  const loadProjects = useCallback(
    () => loadScopedList<Project>('/projects', session),
    [session],
  )

  async function refresh() {
    setProjects(await loadProjects())
  }

  useEffect(() => {
    let cancelled = false

    loadProjects()
      .then((rows) => {
        if (!cancelled) {
          setProjects(rows)
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setMessage(
            error instanceof Error ? error.message : 'Unable to load projects',
          )
        }
      })

    return () => {
      cancelled = true
    }
  }, [loadProjects])

  async function createProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage(null)

    try {
      await apiRequest<Project>('/projects', {
        method: 'POST',
        body: JSON.stringify(
          scopedBody(session, {
            name,
            code,
            budget,
          }),
        ),
      })
      await refresh()
      setMessage('Project created')
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Unable to create project',
      )
    }
  }

  return (
    <>
      <PageHeader eyebrow="Procurement core" title="Projects" />
      <form className="form-grid" onSubmit={(event) => void createProject(event)}>
        <h2>Create project</h2>
        <Field label="Name" name="name" required value={name} onChange={setName} />
        <Field label="Code" name="code" value={code} onChange={setCode} />
        <Field
          label="Budget"
          name="budget"
          type="number"
          value={budget}
          onChange={setBudget}
        />
        <div className="form-actions">
          <button type="submit">Create project</button>
          {message ? <p className="notice">{message}</p> : null}
        </div>
      </form>

      <section className="table-section">
        <h2>Project records</h2>
        {projects.length ? (
          <div className="data-table">
            {projects.map((project) => (
              <article key={project.id}>
                <strong>{project.name}</strong>
                <span>{project.code ?? 'No code'}</span>
                <StatusTag status={project.status} />
                <span>{formatMoney(project.budget)}</span>
              </article>
            ))}
          </div>
        ) : (
          <EmptyNotice>No projects found.</EmptyNotice>
        )}
      </section>
    </>
  )
}

function SuppliersScreen({ session }: { session: AppSession }) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [name, setName] = useState('Amanah Office Supplies Sdn Bhd')
  const [email, setEmail] = useState('supplier@example.test')
  const [phone, setPhone] = useState('+60300000000')
  const [message, setMessage] = useState<string | null>(null)

  const loadSuppliers = useCallback(
    () => loadScopedList<Supplier>('/suppliers', session),
    [session],
  )

  async function refresh() {
    setSuppliers(await loadSuppliers())
  }

  useEffect(() => {
    let cancelled = false

    loadSuppliers()
      .then((rows) => {
        if (!cancelled) {
          setSuppliers(rows)
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setMessage(
            error instanceof Error ? error.message : 'Unable to load suppliers',
          )
        }
      })

    return () => {
      cancelled = true
    }
  }, [loadSuppliers])

  async function createSupplier(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage(null)

    try {
      await apiRequest<Supplier>('/suppliers', {
        method: 'POST',
        body: JSON.stringify(
          scopedBody(session, {
            name,
            email,
            phone,
          }),
        ),
      })
      await refresh()
      setMessage('Supplier created')
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Unable to create supplier',
      )
    }
  }

  return (
    <>
      <PageHeader eyebrow="Procurement core" title="Suppliers" />
      <form className="form-grid" onSubmit={(event) => void createSupplier(event)}>
        <h2>Create supplier</h2>
        <Field label="Name" name="name" required value={name} onChange={setName} />
        <Field
          label="Email"
          name="email"
          type="email"
          value={email}
          onChange={setEmail}
        />
        <Field label="Phone" name="phone" value={phone} onChange={setPhone} />
        <div className="form-actions">
          <button type="submit">Create supplier</button>
          {message ? <p className="notice">{message}</p> : null}
        </div>
      </form>

      <section className="table-section">
        <h2>Supplier records</h2>
        {suppliers.length ? (
          <div className="data-table">
            {suppliers.map((supplier) => (
              <article key={supplier.id}>
                <strong>{supplier.name}</strong>
                <span>{supplier.email ?? 'No email'}</span>
                <span>{supplier.phone ?? 'No phone'}</span>
                <StatusTag status={supplier.status} />
              </article>
            ))}
          </div>
        ) : (
          <EmptyNotice>No suppliers found.</EmptyNotice>
        )}
      </section>
    </>
  )
}

function RequisitionsScreen({
  session,
  navigate,
}: {
  session: AppSession
  navigate: (path: string) => void
}) {
  const [state, setState] = useState<LoadState<Requisition[]>>({
    status: 'loading',
  })
  const [message, setMessage] = useState<string | null>(null)

  const loadRequisitions = useCallback(
    () => loadScopedList<Requisition>('/requisitions', session),
    [session],
  )

  async function refresh() {
    setState({ status: 'ready', data: await loadRequisitions() })
  }

  useEffect(() => {
    let cancelled = false

    loadRequisitions()
      .then((rows) => {
        if (!cancelled) {
          setState({ status: 'ready', data: rows })
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({
            status: 'error',
            message:
              error instanceof Error
                ? error.message
                : 'Unable to load requisitions',
          })
        }
      })

    return () => {
      cancelled = true
    }
  }, [loadRequisitions])

  async function transition(id: string, action: 'submit' | 'approve' | 'reject') {
    setMessage(null)

    try {
      await apiRequest<Requisition>(`/requisitions/${id}/${action}`, {
        method: 'POST',
        body: JSON.stringify({
          actorUserId: session.actorUserId,
          approverUserId: session.actorUserId,
        }),
      })
      await refresh()
      setMessage(`Requisition ${action} complete`)
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Unable to update requisition',
      )
    }
  }

  const requisitions = state.status === 'ready' ? state.data : []

  return (
    <>
      <PageHeader
        eyebrow="Source-to-pay"
        title="Requisitions"
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
        <EmptyNotice>Loading requisitions...</EmptyNotice>
      ) : null}
      {state.status === 'error' ? (
        <p className="error-text">{state.message}</p>
      ) : null}
      {message ? <p className="notice">{message}</p> : null}
      {state.status === 'ready' ? (
        <section className="table-section">
          {requisitions.length ? (
            <div className="data-table data-table--lifecycle">
              {requisitions.map((requisition) => (
                <article key={requisition.id}>
                  <div>
                    <strong>{requisition.title}</strong>
                    <span>{requisition.project?.name ?? 'No project'}</span>
                  </div>
                  <StatusTag status={requisition.status} />
                  <span>{formatMoney(requisition.totalAmount)}</span>
                  <LifecycleTrack status={requisition.status} />
                  <div className="inline-actions">
                    <button
                      type="button"
                      disabled={requisition.status !== 'DRAFT'}
                      onClick={() => void transition(requisition.id, 'submit')}
                    >
                      Submit
                    </button>
                    <button
                      type="button"
                      disabled={requisition.status !== 'SUBMITTED'}
                      onClick={() => void transition(requisition.id, 'approve')}
                    >
                      Approve
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyNotice>No requisitions found.</EmptyNotice>
          )}
        </section>
      ) : null}
    </>
  )
}

function NewRequisitionScreen({
  session,
  navigate,
}: {
  session: AppSession
  navigate: (path: string) => void
}) {
  const [projects, setProjects] = useState<Project[]>([])
  const [projectId, setProjectId] = useState('')
  const [title, setTitle] = useState('Office equipment for project team')
  const [justification, setJustification] = useState('Procurement evidence pack')
  const [description, setDescription] = useState('Laptop workstation')
  const [quantity, setQuantity] = useState('2')
  const [unitPrice, setUnitPrice] = useState('1250')
  const [message, setMessage] = useState<string | null>(null)

  const loadProjects = useCallback(
    () => loadScopedList<Project>('/projects', session),
    [session],
  )

  useEffect(() => {
    let cancelled = false

    loadProjects()
      .then((rows) => {
        if (!cancelled) {
          setProjects(rows)
          setProjectId((current) => current || rows[0]?.id || '')
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setMessage(
            error instanceof Error ? error.message : 'Unable to load projects',
          )
        }
      })

    return () => {
      cancelled = true
    }
  }, [loadProjects])

  async function createRequisition(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage(null)

    try {
      await apiRequest<Requisition>('/requisitions', {
        method: 'POST',
        body: JSON.stringify(
          scopedBody(session, {
            projectId: projectId || undefined,
            requesterUserId: session.actorUserId,
            title,
            justification,
            items: [
              {
                description,
                quantity,
                unitPrice,
              },
            ],
          }),
        ),
      })
      navigate('/procurement/requisitions')
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Unable to create requisition',
      )
    }
  }

  return (
    <>
      <PageHeader eyebrow="Source-to-pay" title="New requisition" />
      <form
        className="form-grid"
        onSubmit={(event) => void createRequisition(event)}
      >
        <Field label="Title" name="title" required value={title} onChange={setTitle} />
        <label className="field">
          <span>Project</span>
          <select
            value={projectId}
            onChange={(event) => setProjectId(event.target.value)}
          >
            <option value="">No project</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </label>
        <Field
          label="Justification"
          name="justification"
          value={justification}
          onChange={setJustification}
        />
        <Field
          label="Item description"
          name="description"
          required
          value={description}
          onChange={setDescription}
        />
        <Field
          label="Quantity"
          name="quantity"
          type="number"
          required
          value={quantity}
          onChange={setQuantity}
        />
        <Field
          label="Unit price"
          name="unitPrice"
          type="number"
          required
          value={unitPrice}
          onChange={setUnitPrice}
        />
        <div className="form-actions">
          <button type="submit">Create requisition</button>
          {message ? <p className="notice">{message}</p> : null}
        </div>
      </form>
    </>
  )
}

function RFQsScreen({ session }: { session: AppSession }) {
  const [rfqs, setRfqs] = useState<RFQ[]>([])
  const [requisitions, setRequisitions] = useState<Requisition[]>([])
  const [requisitionId, setRequisitionId] = useState('')
  const [title, setTitle] = useState('RFQ for approved requisition')
  const [message, setMessage] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    const [rfqRows, requisitionRows] = await Promise.all([
      loadScopedList<RFQ>('/rfqs', session),
      loadScopedList<Requisition>('/requisitions', session),
    ])

    return { rfqRows, requisitionRows }
  }, [session])

  async function refresh() {
    const data = await loadData()
    setRfqs(data.rfqRows)
    setRequisitions(data.requisitionRows)
  }

  useEffect(() => {
    let cancelled = false

    loadData()
      .then((data) => {
        if (!cancelled) {
          setRfqs(data.rfqRows)
          setRequisitions(data.requisitionRows)
          setRequisitionId(
            (current) =>
              current ||
              data.requisitionRows.find(
                (requisition) => requisition.status === 'APPROVED',
              )?.id ||
              '',
          )
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setMessage(error instanceof Error ? error.message : 'Unable to load RFQs')
        }
      })

    return () => {
      cancelled = true
    }
  }, [loadData])

  async function createRFQ(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage(null)

    try {
      await apiRequest<RFQ>('/rfqs', {
        method: 'POST',
        body: JSON.stringify(
          scopedBody(session, {
            requisitionId,
            title,
          }),
        ),
      })
      await refresh()
      setMessage('RFQ created')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to create RFQ')
    }
  }

  async function publishRFQ(id: string) {
    setMessage(null)

    try {
      await apiRequest<RFQ>(`/rfqs/${id}/publish`, {
        method: 'POST',
        body: JSON.stringify({
          actorUserId: session.actorUserId,
        }),
      })
      await refresh()
      setMessage('RFQ published')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to publish RFQ')
    }
  }

  const approvedRequisitions = requisitions.filter(
    (requisition) => requisition.status === 'APPROVED',
  )

  return (
    <>
      <PageHeader eyebrow="Sourcing" title="RFQs" />
      <form className="form-grid" onSubmit={(event) => void createRFQ(event)}>
        <h2>Create RFQ</h2>
        <label className="field">
          <span>Approved requisition</span>
          <select
            required
            value={requisitionId}
            onChange={(event) => setRequisitionId(event.target.value)}
          >
            <option value="">Select requisition</option>
            {approvedRequisitions.map((requisition) => (
              <option key={requisition.id} value={requisition.id}>
                {requisition.title}
              </option>
            ))}
          </select>
        </label>
        <Field label="Title" name="title" value={title} onChange={setTitle} />
        <div className="form-actions">
          <button type="submit" disabled={!approvedRequisitions.length}>
            Create RFQ
          </button>
          {message ? <p className="notice">{message}</p> : null}
        </div>
      </form>

      <section className="table-section">
        <h2>RFQ records</h2>
        {rfqs.length ? (
          <div className="data-table data-table--actions">
            {rfqs.map((rfq) => (
              <article key={rfq.id}>
                <strong>{rfq.title}</strong>
                <span>{rfq.requisition?.title ?? rfq.requisitionId}</span>
                <StatusTag status={rfq.status} />
                <span>{rfq.items?.length ?? 0} lines</span>
                <div className="inline-actions">
                  <button
                    type="button"
                    disabled={rfq.status !== 'DRAFT'}
                    onClick={() => void publishRFQ(rfq.id)}
                  >
                    Publish
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyNotice>No RFQs found.</EmptyNotice>
        )}
      </section>
    </>
  )
}

function QuotationsScreen({ session }: { session: AppSession }) {
  const [rfqs, setRfqs] = useState<RFQ[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [rfqId, setRfqId] = useState('')
  const [supplierId, setSupplierId] = useState('')
  const [unitPrice, setUnitPrice] = useState('')
  const [message, setMessage] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    const [rfqRows, supplierRows, quotationRows] = await Promise.all([
      loadScopedList<RFQ>('/rfqs', session),
      loadScopedList<Supplier>('/suppliers', session),
      loadScopedList<Quotation>('/quotations', session),
    ])

    return { rfqRows, supplierRows, quotationRows }
  }, [session])

  async function refresh() {
    const data = await loadData()
    setRfqs(data.rfqRows)
    setSuppliers(data.supplierRows)
    setQuotations(data.quotationRows)
  }

  useEffect(() => {
    let cancelled = false

    loadData()
      .then((data) => {
        if (!cancelled) {
          setRfqs(data.rfqRows)
          setSuppliers(data.supplierRows)
          setQuotations(data.quotationRows)
          setRfqId(
            (current) =>
              current ||
              data.rfqRows.find((rfq) => rfq.status === 'PUBLISHED')?.id ||
              '',
          )
          setSupplierId((current) => current || data.supplierRows[0]?.id || '')
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setMessage(
            error instanceof Error ? error.message : 'Unable to load quotations',
          )
        }
      })

    return () => {
      cancelled = true
    }
  }, [loadData])

  const selectedRFQ = useMemo(
    () => rfqs.find((rfq) => rfq.id === rfqId),
    [rfqId, rfqs],
  )
  const publishedRFQs = rfqs.filter((rfq) => rfq.status === 'PUBLISHED')

  async function createQuotation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage(null)

    try {
      await apiRequest<Quotation>('/quotations', {
        method: 'POST',
        body: JSON.stringify(
          scopedBody(session, {
            rfqId,
            supplierId,
            items: (selectedRFQ?.items || []).map((item) => ({
              rfqItemId: item.id,
              description: item.description,
              quantity: item.quantity,
              unitPrice: unitPrice || item.targetPrice || 0,
            })),
          }),
        ),
      })
      await refresh()
      setMessage('Quotation recorded')
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Unable to record quotation',
      )
    }
  }

  return (
    <>
      <PageHeader eyebrow="Sourcing" title="Quotations" />
      <form
        className="form-grid"
        onSubmit={(event) => void createQuotation(event)}
      >
        <h2>Record quotation</h2>
        <label className="field">
          <span>Published RFQ</span>
          <select
            required
            value={rfqId}
            onChange={(event) => setRfqId(event.target.value)}
          >
            <option value="">Select RFQ</option>
            {publishedRFQs.map((rfq) => (
              <option key={rfq.id} value={rfq.id}>
                {rfq.title}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Supplier</span>
          <select
            required
            value={supplierId}
            onChange={(event) => setSupplierId(event.target.value)}
          >
            <option value="">Select supplier</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.name}
              </option>
            ))}
          </select>
        </label>
        <Field
          label="Quote unit price"
          name="unitPrice"
          type="number"
          value={unitPrice}
          onChange={setUnitPrice}
        />
        <div className="form-actions">
          <button
            type="submit"
            disabled={!publishedRFQs.length || !suppliers.length}
          >
            Record quotation
          </button>
          {message ? <p className="notice">{message}</p> : null}
        </div>
      </form>

      <section className="table-section">
        <h2>Quotation records</h2>
        {quotations.length ? (
          <div className="data-table">
            {quotations.map((quotation) => (
              <article key={quotation.id}>
                <strong>{quotation.supplier?.name ?? quotation.supplierId}</strong>
                <span>{quotation.rfq?.title ?? quotation.rfqId}</span>
                <StatusTag status={quotation.status} />
                <span>{formatMoney(quotation.totalAmount)}</span>
              </article>
            ))}
          </div>
        ) : (
          <EmptyNotice>No quotations found.</EmptyNotice>
        )}
      </section>
    </>
  )
}

function PurchaseOrdersScreen({ session }: { session: AppSession }) {
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
  const [quotationId, setQuotationId] = useState('')
  const [poNumber, setPoNumber] = useState('')
  const [message, setMessage] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    const [quotationRows, purchaseOrderRows] = await Promise.all([
      loadScopedList<Quotation>('/quotations', session),
      loadScopedList<PurchaseOrder>('/purchase-orders', session),
    ])

    return { quotationRows, purchaseOrderRows }
  }, [session])

  async function refresh() {
    const data = await loadData()
    setQuotations(data.quotationRows)
    setPurchaseOrders(data.purchaseOrderRows)
  }

  useEffect(() => {
    let cancelled = false

    loadData()
      .then((data) => {
        if (!cancelled) {
          setQuotations(data.quotationRows)
          setPurchaseOrders(data.purchaseOrderRows)
          setQuotationId((current) => current || data.quotationRows[0]?.id || '')
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setMessage(
            error instanceof Error
              ? error.message
              : 'Unable to load purchase orders',
          )
        }
      })

    return () => {
      cancelled = true
    }
  }, [loadData])

  async function createPurchaseOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage(null)

    try {
      await apiRequest<PurchaseOrder>('/purchase-orders', {
        method: 'POST',
        body: JSON.stringify(
          scopedBody(session, {
            quotationId,
            poNumber: poNumber || undefined,
          }),
        ),
      })
      await refresh()
      setMessage('Purchase order created')
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Unable to create purchase order',
      )
    }
  }

  async function issuePurchaseOrder(id: string) {
    setMessage(null)

    try {
      await apiRequest<PurchaseOrder>(`/purchase-orders/${id}/issue`, {
        method: 'POST',
        body: JSON.stringify({
          actorUserId: session.actorUserId,
        }),
      })
      await refresh()
      setMessage('Purchase order issued')
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Unable to issue purchase order',
      )
    }
  }

  return (
    <>
      <PageHeader eyebrow="Fulfilment" title="Purchase orders" />
      <form
        className="form-grid"
        onSubmit={(event) => void createPurchaseOrder(event)}
      >
        <h2>Create purchase order</h2>
        <label className="field">
          <span>Quotation</span>
          <select
            required
            value={quotationId}
            onChange={(event) => setQuotationId(event.target.value)}
          >
            <option value="">Select quotation</option>
            {quotations.map((quotation) => (
              <option key={quotation.id} value={quotation.id}>
                {quotation.supplier?.name ?? quotation.supplierId} -{' '}
                {formatMoney(quotation.totalAmount)}
              </option>
            ))}
          </select>
        </label>
        <Field
          label="PO number"
          name="poNumber"
          value={poNumber}
          onChange={setPoNumber}
        />
        <div className="form-actions">
          <button type="submit" disabled={!quotations.length}>
            Create PO
          </button>
          {message ? <p className="notice">{message}</p> : null}
        </div>
      </form>

      <section className="table-section">
        <h2>Purchase order records</h2>
        {purchaseOrders.length ? (
          <div className="data-table data-table--actions">
            {purchaseOrders.map((purchaseOrder) => (
              <article key={purchaseOrder.id}>
                <strong>{purchaseOrder.poNumber}</strong>
                <span>{purchaseOrder.supplier?.name ?? purchaseOrder.supplierId}</span>
                <StatusTag status={purchaseOrder.status} />
                <span>{formatMoney(purchaseOrder.totalAmount)}</span>
                <div className="inline-actions">
                  <button
                    type="button"
                    disabled={purchaseOrder.status !== 'DRAFT'}
                    onClick={() => void issuePurchaseOrder(purchaseOrder.id)}
                  >
                    Issue
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyNotice>No purchase orders found.</EmptyNotice>
        )}
      </section>
    </>
  )
}

function ReceiptsScreen({ session }: { session: AppSession }) {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
  const [purchaseOrderId, setPurchaseOrderId] = useState('')
  const [notes, setNotes] = useState('Goods received in acceptable condition')
  const [message, setMessage] = useState<string | null>(null)

  const loadPurchaseOrders = useCallback(
    () => loadScopedList<PurchaseOrder>('/purchase-orders', session),
    [session],
  )

  async function refresh() {
    const rows = await loadPurchaseOrders()
    setPurchaseOrders(rows)
  }

  useEffect(() => {
    let cancelled = false

    loadPurchaseOrders()
      .then((rows) => {
        if (!cancelled) {
          setPurchaseOrders(rows)
          setPurchaseOrderId(
            (current) =>
              current || rows.find((po) => po.status === 'ISSUED')?.id || '',
          )
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setMessage(
            error instanceof Error ? error.message : 'Unable to load receipts',
          )
        }
      })

    return () => {
      cancelled = true
    }
  }, [loadPurchaseOrders])

  async function createReceipt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage(null)

    try {
      await apiRequest<Receipt>('/receipts', {
        method: 'POST',
        body: JSON.stringify(
          scopedBody(session, {
            purchaseOrderId,
            notes,
          }),
        ),
      })
      await refresh()
      setMessage('Receipt recorded')
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Unable to record receipt',
      )
    }
  }

  const issuedPurchaseOrders = purchaseOrders.filter((po) => po.status === 'ISSUED')

  return (
    <>
      <PageHeader eyebrow="Fulfilment" title="Receipts" />
      <form className="form-grid" onSubmit={(event) => void createReceipt(event)}>
        <h2>Record receipt</h2>
        <label className="field">
          <span>Issued PO</span>
          <select
            required
            value={purchaseOrderId}
            onChange={(event) => setPurchaseOrderId(event.target.value)}
          >
            <option value="">Select purchase order</option>
            {issuedPurchaseOrders.map((purchaseOrder) => (
              <option key={purchaseOrder.id} value={purchaseOrder.id}>
                {purchaseOrder.poNumber}
              </option>
            ))}
          </select>
        </label>
        <Field label="Notes" name="notes" value={notes} onChange={setNotes} />
        <div className="form-actions">
          <button type="submit" disabled={!issuedPurchaseOrders.length}>
            Record receipt
          </button>
          {message ? <p className="notice">{message}</p> : null}
        </div>
      </form>

      <section className="table-section">
        <h2>Receiving status</h2>
        {purchaseOrders.length ? (
          <div className="data-table">
            {purchaseOrders.map((purchaseOrder) => (
              <article key={purchaseOrder.id}>
                <strong>{purchaseOrder.poNumber}</strong>
                <span>{purchaseOrder.supplier?.name ?? purchaseOrder.supplierId}</span>
                <StatusTag status={purchaseOrder.status} />
                <span>{purchaseOrder.receipts?.length ?? 0} receipts</span>
              </article>
            ))}
          </div>
        ) : (
          <EmptyNotice>No purchase orders found.</EmptyNotice>
        )}
      </section>
    </>
  )
}

function InvoicesScreen({ session }: { session: AppSession }) {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
  const [purchaseOrderId, setPurchaseOrderId] = useState('')
  const [invoiceNumber, setInvoiceNumber] = useState(
    () => `INV-${Date.now().toString().slice(-6)}`,
  )
  const [amount, setAmount] = useState('')
  const [message, setMessage] = useState<string | null>(null)

  const loadPurchaseOrders = useCallback(
    () => loadScopedList<PurchaseOrder>('/purchase-orders', session),
    [session],
  )

  async function refresh() {
    const rows = await loadPurchaseOrders()
    setPurchaseOrders(rows)
  }

  useEffect(() => {
    let cancelled = false

    loadPurchaseOrders()
      .then((rows) => {
        if (!cancelled) {
          setPurchaseOrders(rows)
          setPurchaseOrderId(
            (current) =>
              current || rows.find((po) => po.status === 'RECEIVED')?.id || '',
          )
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setMessage(
            error instanceof Error ? error.message : 'Unable to load invoices',
          )
        }
      })

    return () => {
      cancelled = true
    }
  }, [loadPurchaseOrders])

  async function createInvoice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage(null)

    try {
      await apiRequest<Invoice>('/invoices', {
        method: 'POST',
        body: JSON.stringify(
          scopedBody(session, {
            purchaseOrderId,
            invoiceNumber,
            amount: amount || undefined,
          }),
        ),
      })
      await refresh()
      setInvoiceNumber(`INV-${Date.now().toString().slice(-6)}`)
      setMessage('Invoice recorded')
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Unable to record invoice',
      )
    }
  }

  const receivedPurchaseOrders = purchaseOrders.filter(
    (po) => po.status === 'RECEIVED',
  )

  return (
    <>
      <PageHeader eyebrow="Fulfilment" title="Invoices" />
      <form className="form-grid" onSubmit={(event) => void createInvoice(event)}>
        <h2>Record invoice</h2>
        <label className="field">
          <span>Received PO</span>
          <select
            required
            value={purchaseOrderId}
            onChange={(event) => setPurchaseOrderId(event.target.value)}
          >
            <option value="">Select purchase order</option>
            {receivedPurchaseOrders.map((purchaseOrder) => (
              <option key={purchaseOrder.id} value={purchaseOrder.id}>
                {purchaseOrder.poNumber}
              </option>
            ))}
          </select>
        </label>
        <Field
          label="Invoice number"
          name="invoiceNumber"
          required
          value={invoiceNumber}
          onChange={setInvoiceNumber}
        />
        <Field
          label="Amount"
          name="amount"
          type="number"
          value={amount}
          onChange={setAmount}
        />
        <div className="form-actions">
          <button type="submit" disabled={!receivedPurchaseOrders.length}>
            Record invoice
          </button>
          {message ? <p className="notice">{message}</p> : null}
        </div>
      </form>

      <section className="table-section">
        <h2>Invoice status</h2>
        {purchaseOrders.length ? (
          <div className="data-table">
            {purchaseOrders.map((purchaseOrder) => (
              <article key={purchaseOrder.id}>
                <strong>{purchaseOrder.poNumber}</strong>
                <span>{purchaseOrder.supplier?.name ?? purchaseOrder.supplierId}</span>
                <StatusTag status={purchaseOrder.status} />
                <span>{purchaseOrder.invoices?.length ?? 0} invoices</span>
              </article>
            ))}
          </div>
        ) : (
          <EmptyNotice>No purchase orders found.</EmptyNotice>
        )}
      </section>
    </>
  )
}

export function ProcurementRoute({
  path,
  session,
  navigate,
}: ProcurementRouteProps) {
  if (path === '/procurement/projects') {
    return <ProjectsScreen session={session} />
  }

  if (path === '/procurement/suppliers') {
    return <SuppliersScreen session={session} />
  }

  if (path === '/procurement/requisitions') {
    return <RequisitionsScreen session={session} navigate={navigate} />
  }

  if (path === '/procurement/requisitions/new') {
    return <NewRequisitionScreen session={session} navigate={navigate} />
  }

  if (path === '/procurement/rfqs') {
    return <RFQsScreen session={session} />
  }

  if (path === '/procurement/quotations') {
    return <QuotationsScreen session={session} />
  }

  if (path === '/procurement/purchase-orders') {
    return <PurchaseOrdersScreen session={session} />
  }

  if (path === '/procurement/receipts') {
    return <ReceiptsScreen session={session} />
  }

  if (path === '/procurement/invoices') {
    return <InvoicesScreen session={session} />
  }

  return null
}
