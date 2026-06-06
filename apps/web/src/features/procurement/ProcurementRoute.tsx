import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { Route, Routes, useParams } from 'react-router-dom'

import { PageHeader as SharedPageHeader } from '../../layouts/PageHeader'
import { AccessDenied } from '../../shared/components/AccessDenied'
import { EmptyState } from '../../shared/components/EmptyState'
import { Field as SharedField } from '../../shared/components/Field'
import { StatusBadge } from '../../shared/components/StatusBadge'
import { WorkflowStepper } from '../../shared/components/WorkflowStepper'
import type { AppRoleCode } from '../../shared/types'
import { formatCurrency, formatDateTime } from '../../shared/utils/formatting'
import { useAuditTimeline } from '../evidence/api/useAuditTimeline'
import { ProcurementHubPage } from './ProcurementHubPage'
import { ProcurementPage } from './ProcurementPage'
import { useApprovalRules } from './api/useApprovalRules'
import { useApprovalTasks } from './api/useApprovalTasks'
import { useInvoices } from './api/useInvoices'
import { useMatching } from './api/useMatching'
import { useProjects } from './api/useProjects'
import { usePurchaseOrders } from './api/usePurchaseOrders'
import { useQuotations } from './api/useQuotations'
import { useReceipts } from './api/useReceipts'
import { useRequisitions } from './api/useRequisitions'
import { useRfqs } from './api/useRfqs'
import { useSuppliers } from './api/useSuppliers'
import { RequisitionForm } from './requisitions/RequisitionForm'
import type {
  CreateRequisitionFormValues,
  ProcurementProjectOption,
  RequisitionAction,
} from './requisitions/requisition.types'
import {
  buildRequisitionCreatePayload,
  canCreateRequisition,
  canReviewRequisitions,
  canSubmitRequisition,
  getApprovalActionState,
} from './requisitions/requisition.validation'

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
  quotations?: Quotation[]
  purchaseOrders?: PurchaseOrder[]
  invoices?: Invoice[]
}

type UserSummary = {
  id: string
  email: string
  displayName: string
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
  requesterUserId?: string | null
  title: string
  justification?: string | null
  status: string
  totalAmount: number
  createdAt: string
  project?: Pick<Project, 'id' | 'name' | 'code'> | null
  requesterUser?: UserSummary | null
  items?: RequisitionItem[]
  approvalRequests?: {
    id: string
    approverUserId?: string | null
    status: string
    decision?: string | null
    comment?: string | null
    approverUser?: UserSummary | null
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
  supplierId?: string
  invoiceNumber: string
  amount: number
  status: string
  issuedAt: string
}

type AuditEvent = {
  id: string
  eventType: string
  entityType?: string | null
  entityId?: string | null
  createdAt: string
  actorUser?: UserSummary | null
}

type ApprovalTask = {
  id: string
  status: string
  approverUserId?: string | null
  requisition: Requisition
}

type ApprovalRule = {
  id: string
  name: string
  minAmount: number
  maxAmount?: number | null
  approverRoleCode: string
  requiresSegregation: boolean
  isActive: boolean
}

type MatchingRecord = {
  purchaseOrder: PurchaseOrder
  receiptCount: number
  invoiceCount: number
  invoiceTotal: number
  amountMatches: boolean
  matchingStatus: string
}

type LoadState<T> =
  | { status: 'loading' }
  | { status: 'ready'; data: T }
  | { status: 'error'; message: string }

type ProcurementRouteProps = {
  session: AppSession
  navigate: (path: string) => void
  roleCodes: AppRoleCode[]
}

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

function LifecycleTrack({ status }: { status: string }) {
  return <WorkflowStepper steps={lifecycleStates} current={status} />
}

function ProjectsScreen({ session }: { session: AppSession }) {
  const { listProjects, createProject: createProjectRecord } =
    useProjects(session)
  const [projects, setProjects] = useState<Project[]>([])
  const [name, setName] = useState('ERP rollout evidence pack')
  const [code, setCode] = useState('PRJ-MEPN-001')
  const [budget, setBudget] = useState('15000')
  const [message, setMessage] = useState<string | null>(null)

  const loadProjects = useCallback(() => listProjects<Project>(), [listProjects])

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
      await createProjectRecord<Project>(
        scopedBody(session, {
          name,
          code,
          budget,
        }),
      )
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
                <span>{formatCurrency(project.budget)}</span>
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

function SuppliersScreen({
  session,
  navigate,
}: {
  session: AppSession
  navigate: (path: string) => void
}) {
  const { listSuppliers, createSupplier: createSupplierRecord } =
    useSuppliers(session)
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [name, setName] = useState('Amanah Office Supplies Sdn Bhd')
  const [email, setEmail] = useState('supplier@example.test')
  const [phone, setPhone] = useState('+60300000000')
  const [message, setMessage] = useState<string | null>(null)

  const loadSuppliers = useCallback(
    () => listSuppliers<Supplier>(),
    [listSuppliers],
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
      await createSupplierRecord<Supplier>(
        scopedBody(session, {
          name,
          email,
          phone,
        }),
      )
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
          <div className="data-table data-table--actions">
            {suppliers.map((supplier) => (
              <article key={supplier.id}>
                <strong>{supplier.name}</strong>
                <span>{supplier.email ?? 'No email'}</span>
                <span>{supplier.phone ?? 'No phone'}</span>
                <StatusTag status={supplier.status} />
                <div className="inline-actions">
                  <button
                    type="button"
                    onClick={() => navigate(`/procurement/suppliers/${supplier.id}`)}
                  >
                    Open
                  </button>
                </div>
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
  roleCodes,
}: {
  session: AppSession
  navigate: (path: string) => void
  roleCodes: AppRoleCode[]
}) {
  return (
    <ProcurementPage session={session} navigate={navigate} roleCodes={roleCodes} />
  )
}

function NewRequisitionScreen({
  session,
  navigate,
  roleCodes,
}: {
  session: AppSession
  navigate: (path: string) => void
  roleCodes: AppRoleCode[]
}) {
  const { listProjects } = useProjects(session)
  const { createRequisition: createRequisitionRecord } =
    useRequisitions(session)
  const [projects, setProjects] = useState<ProcurementProjectOption[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const canCreate = canCreateRequisition(roleCodes)

  const loadProjects = useCallback(
    () => listProjects<ProcurementProjectOption>(),
    [listProjects],
  )

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

  async function createRequisition(values: CreateRequisitionFormValues) {
    if (!session.organizationId) {
      setMessage('Create an organization first.')
      return
    }

    setIsSubmitting(true)
    setMessage(null)

    try {
      await createRequisitionRecord<Requisition>(
        buildRequisitionCreatePayload(
          values,
          session.organizationId,
          session.actorUserId,
        ),
      )
      navigate('/procurement/requisitions')
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Unable to create requisition',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!canCreate) {
    return <AccessDenied />
  }

  return (
    <>
      <PageHeader eyebrow="Source-to-pay" title="New requisition" />
      {message ? <p className="notice">{message}</p> : null}
      <RequisitionForm
        projects={projects}
        canCreate={canCreate}
        isSubmitting={isSubmitting}
        onSubmit={createRequisition}
      />
    </>
  )
}

function RFQsScreen({
  session,
  navigate,
}: {
  session: AppSession
  navigate: (path: string) => void
}) {
  const { listRequisitions } = useRequisitions(session)
  const { listRfqs, createRfq, publishRfq } = useRfqs(session)
  const [rfqs, setRfqs] = useState<RFQ[]>([])
  const [requisitions, setRequisitions] = useState<Requisition[]>([])
  const [requisitionId, setRequisitionId] = useState('')
  const [title, setTitle] = useState('RFQ for approved requisition')
  const [message, setMessage] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    const [rfqRows, requisitionRows] = await Promise.all([
      listRfqs<RFQ>(),
      listRequisitions<Requisition>(),
    ])

    return { rfqRows, requisitionRows }
  }, [listRequisitions, listRfqs])

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
      await createRfq<RFQ>(
        scopedBody(session, {
          requisitionId,
          title,
        }),
      )
      await refresh()
      setMessage('RFQ created')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to create RFQ')
    }
  }

  async function publishRFQ(id: string) {
    setMessage(null)

    try {
      await publishRfq<RFQ>(id, {
        actorUserId: session.actorUserId,
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
                    onClick={() => navigate(`/procurement/rfqs/${rfq.id}`)}
                  >
                    Open
                  </button>
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
  const { listRfqs } = useRfqs(session)
  const { listSuppliers } = useSuppliers(session)
  const { listQuotations, createQuotation: createQuotationRecord } =
    useQuotations(session)
  const [rfqs, setRfqs] = useState<RFQ[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [rfqId, setRfqId] = useState('')
  const [supplierId, setSupplierId] = useState('')
  const [unitPrice, setUnitPrice] = useState('')
  const [message, setMessage] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    const [rfqRows, supplierRows, quotationRows] = await Promise.all([
      listRfqs<RFQ>(),
      listSuppliers<Supplier>(),
      listQuotations<Quotation>(),
    ])

    return { rfqRows, supplierRows, quotationRows }
  }, [listQuotations, listRfqs, listSuppliers])

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
      await createQuotationRecord<Quotation>(
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
      )
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
                <span>{formatCurrency(quotation.totalAmount)}</span>
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

function PurchaseOrdersScreen({
  session,
  navigate,
}: {
  session: AppSession
  navigate: (path: string) => void
}) {
  const { listQuotations } = useQuotations(session)
  const {
    listPurchaseOrders,
    createPurchaseOrder: createPurchaseOrderRecord,
    issuePurchaseOrder: issuePurchaseOrderRecord,
  } = usePurchaseOrders(session)
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
  const [quotationId, setQuotationId] = useState('')
  const [poNumber, setPoNumber] = useState('')
  const [message, setMessage] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    const [quotationRows, purchaseOrderRows] = await Promise.all([
      listQuotations<Quotation>(),
      listPurchaseOrders<PurchaseOrder>(),
    ])

    return { quotationRows, purchaseOrderRows }
  }, [listPurchaseOrders, listQuotations])

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
      await createPurchaseOrderRecord<PurchaseOrder>(
        scopedBody(session, {
          quotationId,
          poNumber: poNumber || undefined,
        }),
      )
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
      await issuePurchaseOrderRecord<PurchaseOrder>(id, {
        actorUserId: session.actorUserId,
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
                {formatCurrency(quotation.totalAmount)}
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
                <span>{formatCurrency(purchaseOrder.totalAmount)}</span>
                <div className="inline-actions">
                  <button
                    type="button"
                    onClick={() =>
                      navigate(`/procurement/purchase-orders/${purchaseOrder.id}`)
                    }
                  >
                    Open
                  </button>
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
  const { listPurchaseOrders } = usePurchaseOrders(session)
  const { createReceipt: createReceiptRecord } = useReceipts(session)
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
  const [purchaseOrderId, setPurchaseOrderId] = useState('')
  const [notes, setNotes] = useState('Goods received in acceptable condition')
  const [message, setMessage] = useState<string | null>(null)

  const loadPurchaseOrders = useCallback(
    () => listPurchaseOrders<PurchaseOrder>(),
    [listPurchaseOrders],
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
      await createReceiptRecord<Receipt>(
        scopedBody(session, {
          purchaseOrderId,
          notes,
        }),
      )
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
  const { listPurchaseOrders } = usePurchaseOrders(session)
  const { createInvoice: createInvoiceRecord } = useInvoices(session)
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
  const [purchaseOrderId, setPurchaseOrderId] = useState('')
  const [invoiceNumber, setInvoiceNumber] = useState(
    () => `INV-${Date.now().toString().slice(-6)}`,
  )
  const [amount, setAmount] = useState('')
  const [message, setMessage] = useState<string | null>(null)

  const loadPurchaseOrders = useCallback(
    () => listPurchaseOrders<PurchaseOrder>(),
    [listPurchaseOrders],
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
      await createInvoiceRecord<Invoice>(
        scopedBody(session, {
          purchaseOrderId,
          invoiceNumber,
          amount: amount || undefined,
        }),
      )
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

function EntityTimelinePanel({
  session,
  entityType,
  entityId,
}: {
  session: AppSession
  entityType: string
  entityId: string
}) {
  const { listAuditTimeline } = useAuditTimeline(session)
  const [events, setEvents] = useState<AuditEvent[]>([])
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    listAuditTimeline<AuditEvent>(entityType, entityId)
      .then((rows) => {
        if (!cancelled) {
          setEvents(rows)
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setMessage(
            error instanceof Error ? error.message : 'Unable to load timeline',
          )
        }
      })

    return () => {
      cancelled = true
    }
  }, [entityId, entityType, listAuditTimeline])

  return (
    <section className="table-section">
      <h2>Procurement timeline</h2>
      {message ? <p className="error-text">{message}</p> : null}
      {events.length ? (
        <div className="data-table">
          {events.map((event) => (
            <article key={event.id}>
              <strong>{event.eventType}</strong>
              <span>{event.actorUser?.displayName ?? 'System'}</span>
              <span>{formatDateTime(event.createdAt)}</span>
            </article>
          ))}
        </div>
      ) : (
        <EmptyNotice>No audit events found for this record.</EmptyNotice>
      )}
    </section>
  )
}

function RequisitionDetailScreen({
  session,
  roleCodes,
}: {
  session: AppSession
  roleCodes: AppRoleCode[]
}) {
  const { id = '' } = useParams()
  const { getRequisition, transitionRequisition } = useRequisitions(session)
  const [state, setState] = useState<LoadState<Requisition>>({
    status: 'loading',
  })
  const [message, setMessage] = useState<string | null>(null)

  const loadRequisition = useCallback(
    () => getRequisition<Requisition>(id),
    [getRequisition, id],
  )

  async function refresh() {
    setState({ status: 'ready', data: await loadRequisition() })
  }

  useEffect(() => {
    let cancelled = false

    loadRequisition()
      .then((requisition) => {
        if (!cancelled) {
          setState({ status: 'ready', data: requisition })
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({
            status: 'error',
            message:
              error instanceof Error ? error.message : 'Unable to load requisition',
          })
        }
      })

    return () => {
      cancelled = true
    }
  }, [loadRequisition])

  async function transition(action: RequisitionAction) {
    setMessage(null)

    try {
      await transitionRequisition<Requisition>(id, action, {
        actorUserId: session.actorUserId,
        ...(action === 'submit'
          ? {}
          : { approverUserId: session.actorUserId }),
      })
      await refresh()
      setMessage(`Requisition ${action} complete`)
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Unable to update requisition',
      )
    }
  }

  const requisition = state.status === 'ready' ? state.data : null
  const isRequester = requisition?.requesterUserId === session.actorUserId
  const approvalState = requisition
    ? getApprovalActionState(requisition, roleCodes, session.actorUserId)
    : null
  const canSubmit = requisition
    ? canSubmitRequisition(requisition, roleCodes)
    : false
  const canReview = canReviewRequisitions(roleCodes)

  return (
    <>
      <PageHeader eyebrow="Source-to-pay" title="Requisition detail" />
      {state.status === 'loading' ? <EmptyNotice>Loading requisition...</EmptyNotice> : null}
      {state.status === 'error' ? <p className="error-text">{state.message}</p> : null}
      {message ? <p className="notice">{message}</p> : null}
      {requisition ? (
        <>
          <section className="details-grid">
            <article>
              <span>Title</span>
              <strong>{requisition.title}</strong>
            </article>
            <article>
              <span>Status</span>
              <strong>{requisition.status}</strong>
            </article>
            <article>
              <span>Total</span>
              <strong>{formatCurrency(requisition.totalAmount)}</strong>
            </article>
            <article>
              <span>Requester</span>
              <strong>{requisition.requesterUser?.displayName ?? 'Unassigned'}</strong>
            </article>
          </section>
          {isRequester ? (
            <p className="notice">Requester cannot approve their own requisition.</p>
          ) : null}
          {approvalState?.reason ? (
            <p className="notice">{approvalState.reason}</p>
          ) : null}
          <section className="table-section">
            <h2>Workflow</h2>
            <LifecycleTrack status={requisition.status} />
            <div className="inline-actions">
              <button
                type="button"
                disabled={!canSubmit}
                onClick={() => void transition('submit')}
              >
                Submit
              </button>
              {canReview ? (
                <>
                  <button
                    type="button"
                    disabled={!approvalState?.canApprove}
                    title={approvalState?.reason}
                    onClick={() => void transition('approve')}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={!approvalState?.canReject}
                    title={approvalState?.reason}
                    onClick={() => void transition('reject')}
                  >
                    Reject
                  </button>
                </>
              ) : null}
            </div>
          </section>
          <section className="table-section">
            <h2>Line items</h2>
            <div className="data-table">
              {(requisition.items ?? []).map((item) => (
                <article key={item.id}>
                  <strong>{item.description}</strong>
                  <span>Qty {item.quantity}</span>
                  <span>{formatCurrency(item.unitPrice)}</span>
                </article>
              ))}
            </div>
          </section>
          <section className="table-section">
            <h2>Approvals</h2>
            {requisition.approvalRequests?.length ? (
              <div className="data-table">
                {requisition.approvalRequests.map((approval) => (
                  <article key={approval.id}>
                    <strong>{approval.approverUser?.displayName ?? 'Unassigned'}</strong>
                    <StatusTag status={approval.status} />
                    <span>{approval.comment ?? approval.decision ?? 'Pending'}</span>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyNotice>No approval requests yet.</EmptyNotice>
            )}
          </section>
          <EntityTimelinePanel
            session={session}
            entityType="Requisition"
            entityId={requisition.id}
          />
        </>
      ) : null}
    </>
  )
}

function ApprovalInboxScreen({
  session,
  roleCodes,
}: {
  session: AppSession
  roleCodes: AppRoleCode[]
}) {
  const { listApprovalTasks } = useApprovalTasks(session)
  const { transitionRequisition } = useRequisitions(session)
  const [tasks, setTasks] = useState<ApprovalTask[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const canReview = canReviewRequisitions(roleCodes)

  const loadTasks = useCallback(
    () => listApprovalTasks<ApprovalTask>(),
    [listApprovalTasks],
  )

  async function refresh() {
    setTasks(await loadTasks())
  }

  useEffect(() => {
    let cancelled = false

    loadTasks()
      .then((rows) => {
        if (!cancelled) {
          setTasks(rows)
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setMessage(
            error instanceof Error ? error.message : 'Unable to load approvals',
          )
        }
      })

    return () => {
      cancelled = true
    }
  }, [loadTasks])

  async function decide(task: ApprovalTask, action: 'approve' | 'reject') {
    setMessage(null)

    try {
      await transitionRequisition<Requisition>(task.requisition.id, action, {
        actorUserId: session.actorUserId,
        approverUserId: session.actorUserId,
      })
      await refresh()
      setMessage(`Approval ${action} complete`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to decide task')
    }
  }

  if (!canReview) {
    return <AccessDenied />
  }

  return (
    <>
      <PageHeader eyebrow="Approvals" title="Task inbox" />
      {message ? <p className="notice">{message}</p> : null}
      <section className="table-section">
        <h2>Pending approvals</h2>
        {tasks.length ? (
          <div className="data-table data-table--actions">
            {tasks.map((task) => {
              const approvalState = getApprovalActionState(
                task.requisition,
                roleCodes,
                session.actorUserId,
              )

              return (
                <article key={task.id}>
                  <strong>{task.requisition.title}</strong>
                  <span>{task.requisition.project?.name ?? 'No project'}</span>
                  <span>{formatCurrency(task.requisition.totalAmount)}</span>
                  <StatusTag status={task.status} />
                  <div className="inline-actions">
                    <button
                      type="button"
                      disabled={!approvalState.canApprove}
                      title={approvalState.reason}
                      onClick={() => void decide(task, 'approve')}
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      disabled={!approvalState.canReject}
                      title={approvalState.reason}
                      onClick={() => void decide(task, 'reject')}
                    >
                      Reject
                    </button>
                  </div>
                  {approvalState.reason ? (
                    <p className="requisition-reason">{approvalState.reason}</p>
                  ) : null}
                </article>
              )
            })}
          </div>
        ) : (
          <EmptyNotice>No pending approval tasks.</EmptyNotice>
        )}
      </section>
    </>
  )
}

function ApprovalRulesScreen({ session }: { session: AppSession }) {
  const { listApprovalRules, createApprovalRule, updateApprovalRule } =
    useApprovalRules(session)
  const [rules, setRules] = useState<ApprovalRule[]>([])
  const [name, setName] = useState('Standard procurement approval')
  const [minAmount, setMinAmount] = useState('0')
  const [maxAmount, setMaxAmount] = useState('')
  const [approverRoleCode, setApproverRoleCode] = useState('APPROVER')
  const [message, setMessage] = useState<string | null>(null)

  const loadRules = useCallback(
    () => listApprovalRules<ApprovalRule>(),
    [listApprovalRules],
  )

  async function refresh() {
    setRules(await loadRules())
  }

  useEffect(() => {
    let cancelled = false

    loadRules()
      .then((rows) => {
        if (!cancelled) {
          setRules(rows)
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setMessage(
            error instanceof Error ? error.message : 'Unable to load rules',
          )
        }
      })

    return () => {
      cancelled = true
    }
  }, [loadRules])

  async function createRule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage(null)

    try {
      await createApprovalRule<ApprovalRule>(
        scopedBody(session, {
          name,
          minAmount,
          maxAmount: maxAmount || undefined,
          approverRoleCode,
          requiresSegregation: true,
        }),
      )
      await refresh()
      setMessage('Approval rule saved')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to save rule')
    }
  }

  async function toggleRule(rule: ApprovalRule) {
    setMessage(null)

    try {
      await updateApprovalRule<ApprovalRule>(rule.id, {
        actorUserId: session.actorUserId,
        isActive: !rule.isActive,
      })
      await refresh()
      setMessage('Approval rule updated')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to update rule')
    }
  }

  return (
    <>
      <PageHeader eyebrow="Approval routing" title="Approval rules" />
      <form className="form-grid" onSubmit={(event) => void createRule(event)}>
        <h2>Create rule</h2>
        <Field label="Name" name="name" required value={name} onChange={setName} />
        <Field
          label="Minimum amount"
          name="minAmount"
          type="number"
          value={minAmount}
          onChange={setMinAmount}
        />
        <Field
          label="Maximum amount"
          name="maxAmount"
          type="number"
          value={maxAmount}
          onChange={setMaxAmount}
        />
        <Field
          label="Approver role"
          name="approverRoleCode"
          required
          value={approverRoleCode}
          onChange={setApproverRoleCode}
        />
        <div className="form-actions">
          <button type="submit">Save rule</button>
          {message ? <p className="notice">{message}</p> : null}
        </div>
      </form>
      <section className="table-section">
        <h2>Configured rules</h2>
        {rules.length ? (
          <div className="data-table data-table--actions">
            {rules.map((rule) => (
              <article key={rule.id}>
                <strong>{rule.name}</strong>
                <span>
                  {formatCurrency(rule.minAmount)} -{' '}
                  {rule.maxAmount ? formatCurrency(rule.maxAmount) : 'No cap'}
                </span>
                <span>{rule.approverRoleCode}</span>
                <StatusTag status={rule.isActive ? 'ACTIVE' : 'INACTIVE'} />
                <div className="inline-actions">
                  <button type="button" onClick={() => void toggleRule(rule)}>
                    {rule.isActive ? 'Disable' : 'Enable'}
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyNotice>No approval rules configured.</EmptyNotice>
        )}
      </section>
    </>
  )
}

function SupplierDetailScreen({ session }: { session: AppSession }) {
  const { id = '' } = useParams()
  const { getSupplier } = useSuppliers(session)
  const [state, setState] = useState<LoadState<Supplier>>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false

    getSupplier<Supplier>(id)
      .then((supplier) => {
        if (!cancelled) {
          setState({ status: 'ready', data: supplier })
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({
            status: 'error',
            message: error instanceof Error ? error.message : 'Unable to load supplier',
          })
        }
      })

    return () => {
      cancelled = true
    }
  }, [getSupplier, id])

  const supplier = state.status === 'ready' ? state.data : null

  return (
    <>
      <PageHeader eyebrow="Supplier profile" title="Supplier detail" />
      {state.status === 'loading' ? <EmptyNotice>Loading supplier...</EmptyNotice> : null}
      {state.status === 'error' ? <p className="error-text">{state.message}</p> : null}
      {supplier ? (
        <>
          <section className="details-grid">
            <article>
              <span>Name</span>
              <strong>{supplier.name}</strong>
            </article>
            <article>
              <span>Email</span>
              <strong>{supplier.email ?? 'Not provided'}</strong>
            </article>
            <article>
              <span>Phone</span>
              <strong>{supplier.phone ?? 'Not provided'}</strong>
            </article>
            <article>
              <span>Status</span>
              <strong>{supplier.status}</strong>
            </article>
          </section>
          <section className="table-section">
            <h2>Supplier activity</h2>
            <div className="data-table">
              <article>
                <strong>{supplier.quotations?.length ?? 0}</strong>
                <span>Quotations</span>
              </article>
              <article>
                <strong>{supplier.purchaseOrders?.length ?? 0}</strong>
                <span>Purchase orders</span>
              </article>
              <article>
                <strong>{supplier.invoices?.length ?? 0}</strong>
                <span>Invoices</span>
              </article>
            </div>
          </section>
          <EntityTimelinePanel session={session} entityType="Supplier" entityId={supplier.id} />
        </>
      ) : null}
    </>
  )
}

function RFQDetailScreen({ session }: { session: AppSession }) {
  const { id = '' } = useParams()
  const { getRfq, publishRfq } = useRfqs(session)
  const [state, setState] = useState<LoadState<RFQ>>({ status: 'loading' })
  const [message, setMessage] = useState<string | null>(null)

  const loadRfq = useCallback(() => getRfq<RFQ>(id), [getRfq, id])

  async function refresh() {
    setState({ status: 'ready', data: await loadRfq() })
  }

  useEffect(() => {
    let cancelled = false

    loadRfq()
      .then((rfq) => {
        if (!cancelled) {
          setState({ status: 'ready', data: rfq })
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({
            status: 'error',
            message: error instanceof Error ? error.message : 'Unable to load RFQ',
          })
        }
      })

    return () => {
      cancelled = true
    }
  }, [loadRfq])

  async function publish() {
    setMessage(null)

    try {
      await publishRfq<RFQ>(id, { actorUserId: session.actorUserId })
      await refresh()
      setMessage('RFQ published')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to publish RFQ')
    }
  }

  const rfq = state.status === 'ready' ? state.data : null

  return (
    <>
      <PageHeader eyebrow="Sourcing" title="RFQ detail" />
      {state.status === 'loading' ? <EmptyNotice>Loading RFQ...</EmptyNotice> : null}
      {state.status === 'error' ? <p className="error-text">{state.message}</p> : null}
      {message ? <p className="notice">{message}</p> : null}
      {rfq ? (
        <>
          <section className="details-grid">
            <article>
              <span>Title</span>
              <strong>{rfq.title}</strong>
            </article>
            <article>
              <span>Status</span>
              <strong>{rfq.status}</strong>
            </article>
            <article>
              <span>Requisition</span>
              <strong>{rfq.requisition?.title ?? rfq.requisitionId}</strong>
            </article>
            <article>
              <span>Quotations</span>
              <strong>{rfq.quotations?.length ?? 0}</strong>
            </article>
          </section>
          <div className="inline-actions">
            <button type="button" disabled={rfq.status !== 'DRAFT'} onClick={() => void publish()}>
              Publish
            </button>
          </div>
          <section className="table-section">
            <h2>RFQ items</h2>
            <div className="data-table">
              {(rfq.items ?? []).map((item) => (
                <article key={item.id}>
                  <strong>{item.description}</strong>
                  <span>Qty {item.quantity}</span>
                  <span>{formatCurrency(item.targetPrice)}</span>
                </article>
              ))}
            </div>
          </section>
          <section className="table-section">
            <h2>Supplier quotations</h2>
            {rfq.quotations?.length ? (
              <div className="data-table">
                {rfq.quotations.map((quotation) => (
                  <article key={quotation.id}>
                    <strong>{quotation.supplier?.name ?? quotation.supplierId}</strong>
                    <StatusTag status={quotation.status} />
                    <span>{formatCurrency(quotation.totalAmount)}</span>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyNotice>No quotations recorded.</EmptyNotice>
            )}
          </section>
          <EntityTimelinePanel session={session} entityType="RFQ" entityId={rfq.id} />
        </>
      ) : null}
    </>
  )
}

function QuotationComparisonScreen({ session }: { session: AppSession }) {
  const { listRfqs } = useRfqs(session)
  const { listQuotations } = useQuotations(session)
  const [rfqs, setRfqs] = useState<RFQ[]>([])
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [rfqId, setRfqId] = useState('')
  const [message, setMessage] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    const [rfqRows, quotationRows] = await Promise.all([
      listRfqs<RFQ>(),
      listQuotations<Quotation>(),
    ])

    return { rfqRows, quotationRows }
  }, [listQuotations, listRfqs])

  useEffect(() => {
    let cancelled = false

    loadData()
      .then((data) => {
        if (!cancelled) {
          setRfqs(data.rfqRows)
          setQuotations(data.quotationRows)
          setRfqId((current) => current || data.rfqRows[0]?.id || '')
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setMessage(
            error instanceof Error ? error.message : 'Unable to load comparison',
          )
        }
      })

    return () => {
      cancelled = true
    }
  }, [loadData])

  const selectedQuotations = quotations
    .filter((quotation) => quotation.rfqId === rfqId)
    .toSorted((left, right) => left.totalAmount - right.totalAmount)

  return (
    <>
      <PageHeader eyebrow="Sourcing" title="Quotation comparison" />
      {message ? <p className="notice">{message}</p> : null}
      <label className="field">
        <span>RFQ</span>
        <select value={rfqId} onChange={(event) => setRfqId(event.target.value)}>
          <option value="">Select RFQ</option>
          {rfqs.map((rfq) => (
            <option key={rfq.id} value={rfq.id}>
              {rfq.title}
            </option>
          ))}
        </select>
      </label>
      <section className="table-section">
        <h2>Ranked quotations</h2>
        {selectedQuotations.length ? (
          <div className="data-table">
            {selectedQuotations.map((quotation, index) => (
              <article key={quotation.id}>
                <strong>
                  #{index + 1} {quotation.supplier?.name ?? quotation.supplierId}
                </strong>
                <StatusTag status={quotation.status} />
                <span>{formatCurrency(quotation.totalAmount)}</span>
                <span>{quotation.items?.length ?? 0} line items</span>
              </article>
            ))}
          </div>
        ) : (
          <EmptyNotice>No quotations recorded for this RFQ.</EmptyNotice>
        )}
      </section>
    </>
  )
}

function PurchaseOrderDetailScreen({ session }: { session: AppSession }) {
  const { id = '' } = useParams()
  const { getPurchaseOrder, issuePurchaseOrder } = usePurchaseOrders(session)
  const [state, setState] = useState<LoadState<PurchaseOrder>>({
    status: 'loading',
  })
  const [message, setMessage] = useState<string | null>(null)

  const loadPurchaseOrder = useCallback(
    () => getPurchaseOrder<PurchaseOrder>(id),
    [getPurchaseOrder, id],
  )

  async function refresh() {
    setState({ status: 'ready', data: await loadPurchaseOrder() })
  }

  useEffect(() => {
    let cancelled = false

    loadPurchaseOrder()
      .then((purchaseOrder) => {
        if (!cancelled) {
          setState({ status: 'ready', data: purchaseOrder })
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({
            status: 'error',
            message:
              error instanceof Error
                ? error.message
                : 'Unable to load purchase order',
          })
        }
      })

    return () => {
      cancelled = true
    }
  }, [loadPurchaseOrder])

  async function issue() {
    setMessage(null)

    try {
      await issuePurchaseOrder<PurchaseOrder>(id, {
        actorUserId: session.actorUserId,
      })
      await refresh()
      setMessage('Purchase order issued')
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Unable to issue purchase order',
      )
    }
  }

  const purchaseOrder = state.status === 'ready' ? state.data : null

  return (
    <>
      <PageHeader eyebrow="Fulfilment" title="Purchase order detail" />
      {state.status === 'loading' ? <EmptyNotice>Loading purchase order...</EmptyNotice> : null}
      {state.status === 'error' ? <p className="error-text">{state.message}</p> : null}
      {message ? <p className="notice">{message}</p> : null}
      {purchaseOrder ? (
        <>
          <section className="details-grid">
            <article>
              <span>PO number</span>
              <strong>{purchaseOrder.poNumber}</strong>
            </article>
            <article>
              <span>Status</span>
              <strong>{purchaseOrder.status}</strong>
            </article>
            <article>
              <span>Supplier</span>
              <strong>{purchaseOrder.supplier?.name ?? purchaseOrder.supplierId}</strong>
            </article>
            <article>
              <span>Total</span>
              <strong>{formatCurrency(purchaseOrder.totalAmount)}</strong>
            </article>
          </section>
          <div className="inline-actions">
            <button
              type="button"
              disabled={purchaseOrder.status !== 'DRAFT'}
              onClick={() => void issue()}
            >
              Issue PO
            </button>
          </div>
          <section className="table-section">
            <h2>Line items</h2>
            <div className="data-table">
              {(purchaseOrder.items ?? []).map((item) => (
                <article key={item.id}>
                  <strong>{item.description}</strong>
                  <span>Qty {item.quantity}</span>
                  <span>{formatCurrency(item.unitPrice)}</span>
                </article>
              ))}
            </div>
          </section>
          <section className="table-section">
            <h2>Receipts and invoices</h2>
            <div className="data-table">
              <article>
                <strong>{purchaseOrder.receipts?.length ?? 0}</strong>
                <span>Receipts</span>
              </article>
              <article>
                <strong>{purchaseOrder.invoices?.length ?? 0}</strong>
                <span>Invoices</span>
              </article>
            </div>
          </section>
          <EntityTimelinePanel
            session={session}
            entityType="PurchaseOrder"
            entityId={purchaseOrder.id}
          />
        </>
      ) : null}
    </>
  )
}

function MatchingScreen({ session }: { session: AppSession }) {
  const { listMatchingRecords } = useMatching(session)
  const [records, setRecords] = useState<MatchingRecord[]>([])
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    listMatchingRecords<MatchingRecord>()
      .then((rows) => {
        if (!cancelled) {
          setRecords(rows)
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setMessage(error instanceof Error ? error.message : 'Unable to load matching')
        }
      })

    return () => {
      cancelled = true
    }
  }, [listMatchingRecords])

  return (
    <>
      <PageHeader eyebrow="Three-way match" title="Receipt and invoice matching" />
      {message ? <p className="notice">{message}</p> : null}
      <section className="table-section">
        <h2>Matching queue</h2>
        {records.length ? (
          <div className="data-table">
            {records.map((record) => (
              <article key={record.purchaseOrder.id}>
                <strong>{record.purchaseOrder.poNumber}</strong>
                <span>{record.purchaseOrder.supplier?.name ?? 'No supplier'}</span>
                <StatusTag status={record.matchingStatus} />
                <span>
                  {record.receiptCount} receipts / {record.invoiceCount} invoices
                </span>
                <span>{formatCurrency(record.invoiceTotal)}</span>
              </article>
            ))}
          </div>
        ) : (
          <EmptyNotice>No purchase orders available for matching.</EmptyNotice>
        )}
      </section>
    </>
  )
}

export function ProcurementRoute({
  session,
  navigate,
  roleCodes,
}: ProcurementRouteProps) {
  return (
    <Routes>
      <Route
        index
        element={
          <ProcurementHubPage
            session={session}
            navigate={navigate}
            roleCodes={roleCodes}
          />
        }
      />
      <Route path="projects" element={<ProjectsScreen session={session} />} />
      <Route
        path="suppliers"
        element={<SuppliersScreen session={session} navigate={navigate} />}
      />
      <Route
        path="suppliers/:id"
        element={<SupplierDetailScreen session={session} />}
      />
      <Route
        path="requisitions"
        element={
          <RequisitionsScreen
            session={session}
            navigate={navigate}
            roleCodes={roleCodes}
          />
        }
      />
      <Route
        path="requisitions/:id"
        element={
          <RequisitionDetailScreen session={session} roleCodes={roleCodes} />
        }
      />
      <Route
        path="requisitions/new"
        element={
          <NewRequisitionScreen
            session={session}
            navigate={navigate}
            roleCodes={roleCodes}
          />
        }
      />
      <Route
        path="approvals"
        element={<ApprovalInboxScreen session={session} roleCodes={roleCodes} />}
      />
      <Route
        path="approval-rules"
        element={<ApprovalRulesScreen session={session} />}
      />
      <Route
        path="rfqs"
        element={<RFQsScreen session={session} navigate={navigate} />}
      />
      <Route path="rfqs/:id" element={<RFQDetailScreen session={session} />} />
      <Route path="quotations" element={<QuotationsScreen session={session} />} />
      <Route
        path="quotations/compare"
        element={<QuotationComparisonScreen session={session} />}
      />
      <Route
        path="purchase-orders"
        element={<PurchaseOrdersScreen session={session} navigate={navigate} />}
      />
      <Route
        path="purchase-orders/:id"
        element={<PurchaseOrderDetailScreen session={session} />}
      />
      <Route path="receipts" element={<ReceiptsScreen session={session} />} />
      <Route path="invoices" element={<InvoicesScreen session={session} />} />
      <Route path="matching" element={<MatchingScreen session={session} />} />
      <Route path="*" element={null} />
    </Routes>
  )
}
