import { useCallback, useEffect, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'

type AppSession = {
  organizationId: string | null
  actorUserId: string | null
}

type EvidenceRouteProps = {
  path: string
  session: AppSession
}

type Project = {
  id: string
  name: string
  code?: string | null
  status: string
}

type DocumentVersion = {
  id: string
  versionNumber: number
  fileName: string
  mimeType?: string | null
  storageUri?: string | null
  contentHash?: string | null
  hashAlgorithm: string
  createdAt: string
}

type DocumentRecord = {
  id: string
  title: string
  documentType: string
  linkedEntityType?: string | null
  linkedEntityId?: string | null
  status: string
  versions?: DocumentVersion[]
}

type EvidenceItem = {
  id: string
  entityType: string
  entityId: string
  label: string
  evidenceType: string
  document?: DocumentRecord | null
  documentVersion?: DocumentVersion | null
  evidencePack?: Pick<EvidencePack, 'id' | 'title' | 'status'> | null
  createdAt: string
}

type EvidencePack = {
  id: string
  title: string
  projectId?: string | null
  status: string
  summary?: {
    counts?: Record<string, number>
  } | null
  exportedAt?: string | null
  items?: EvidenceItem[]
}

type HashRecord = {
  id: string
  entityType: string
  entityId: string
  hashAlgorithm: string
  canonicalHash: string
  createdAt: string
}

type HashVerification = {
  id: string
  entityType: string
  entityId: string
  valid: boolean
  storedHash: string
  computedHash: string
  source: string
}

type AuditEvent = {
  id: string
  eventType: string
  entityType?: string | null
  entityId?: string | null
  createdAt: string
  actorUser?: {
    displayName: string
  } | null
}

const apiBaseUrl =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1'

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

function organizationQuery(session: AppSession) {
  if (!session.organizationId) {
    throw new Error('Create an organization first')
  }

  return `organizationId=${encodeURIComponent(session.organizationId)}`
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

function TextAreaField({
  label,
  name,
  value,
  onChange,
}: {
  label: string
  name: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <textarea
        name={name}
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

function DocumentsScreen({ session }: { session: AppSession }) {
  const [title, setTitle] = useState('Supplier quotation PDF')
  const [documentType, setDocumentType] = useState('QUOTATION')
  const [linkedEntityType, setLinkedEntityType] = useState('Quotation')
  const [linkedEntityId, setLinkedEntityId] = useState('')
  const [fileName, setFileName] = useState('quotation.pdf')
  const [storageUri, setStorageUri] = useState('minio://mepn-evidence/quotation.pdf')
  const [canonicalContent, setCanonicalContent] = useState(
    '{"kind":"quotation","source":"local-registration"}',
  )
  const [document, setDocument] = useState<DocumentRecord | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  async function registerDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage(null)

    try {
      const parsedContent = canonicalContent.trim()
        ? JSON.parse(canonicalContent)
        : undefined
      const created = await apiRequest<DocumentRecord>('/documents', {
        method: 'POST',
        body: JSON.stringify(
          scopedBody(session, {
            title,
            documentType,
            linkedEntityType,
            linkedEntityId: linkedEntityId || undefined,
            version: {
              actorUserId: session.actorUserId,
              fileName,
              storageUri,
              canonicalContent: parsedContent,
              metadata: {
                source: 'local-registration',
              },
            },
          }),
        ),
      })
      setDocument(created)
      setMessage('Document registered with immutable version')
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Unable to register document',
      )
    }
  }

  return (
    <>
      <PageHeader eyebrow="Evidence registry" title="Documents" />
      <form
        className="form-grid"
        onSubmit={(event) => void registerDocument(event)}
      >
        <h2>Register document</h2>
        <Field label="Title" name="title" required value={title} onChange={setTitle} />
        <Field
          label="Document type"
          name="documentType"
          required
          value={documentType}
          onChange={setDocumentType}
        />
        <Field
          label="Linked entity type"
          name="linkedEntityType"
          value={linkedEntityType}
          onChange={setLinkedEntityType}
        />
        <Field
          label="Linked entity ID"
          name="linkedEntityId"
          value={linkedEntityId}
          onChange={setLinkedEntityId}
        />
        <Field
          label="File name"
          name="fileName"
          required
          value={fileName}
          onChange={setFileName}
        />
        <Field
          label="Storage URI"
          name="storageUri"
          value={storageUri}
          onChange={setStorageUri}
        />
        <TextAreaField
          label="Canonical content JSON"
          name="canonicalContent"
          value={canonicalContent}
          onChange={setCanonicalContent}
        />
        <div className="form-actions">
          <button type="submit">Register document</button>
          {message ? <p className="notice">{message}</p> : null}
        </div>
      </form>

      <section className="table-section">
        <h2>Latest registration</h2>
        {document ? (
          <div className="data-table data-table--evidence">
            <article>
              <strong>{document.title}</strong>
              <span>{document.id}</span>
              <span>{document.versions?.[0]?.fileName ?? 'No version'}</span>
              <span className="hash-text">
                {document.versions?.[0]?.contentHash ?? 'No hash'}
              </span>
            </article>
          </div>
        ) : (
          <EmptyNotice>No document registered in this session.</EmptyNotice>
        )}
      </section>
    </>
  )
}

function EvidenceItemsScreen({ session }: { session: AppSession }) {
  const [items, setItems] = useState<EvidenceItem[]>([])
  const [entityType, setEntityType] = useState('PurchaseOrder')
  const [entityId, setEntityId] = useState('')
  const [documentId, setDocumentId] = useState('')
  const [documentVersionId, setDocumentVersionId] = useState('')
  const [label, setLabel] = useState('Purchase order evidence')
  const [message, setMessage] = useState<string | null>(null)

  const loadItems = useCallback(
    () =>
      session.organizationId
        ? apiRequest<EvidenceItem[]>(
            `/evidence-items?${organizationQuery(session)}`,
          )
        : Promise.resolve([]),
    [session],
  )

  async function refresh() {
    setItems(await loadItems())
  }

  useEffect(() => {
    let cancelled = false

    loadItems()
      .then((rows) => {
        if (!cancelled) {
          setItems(rows)
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setMessage(
            error instanceof Error
              ? error.message
              : 'Unable to load evidence items',
          )
        }
      })

    return () => {
      cancelled = true
    }
  }, [loadItems])

  async function createItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage(null)

    try {
      await apiRequest<EvidenceItem>('/evidence-items', {
        method: 'POST',
        body: JSON.stringify(
          scopedBody(session, {
            entityType,
            entityId,
            label,
            evidenceType: 'SUPPORTING_DOCUMENT',
            documentId: documentId || undefined,
            documentVersionId: documentVersionId || undefined,
          }),
        ),
      })
      await refresh()
      setMessage('Evidence item linked')
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Unable to link evidence item',
      )
    }
  }

  return (
    <>
      <PageHeader eyebrow="Evidence registry" title="Evidence items" />
      <form className="form-grid" onSubmit={(event) => void createItem(event)}>
        <h2>Link evidence</h2>
        <Field
          label="Entity type"
          name="entityType"
          required
          value={entityType}
          onChange={setEntityType}
        />
        <Field
          label="Entity ID"
          name="entityId"
          required
          value={entityId}
          onChange={setEntityId}
        />
        <Field label="Label" name="label" required value={label} onChange={setLabel} />
        <Field
          label="Document ID"
          name="documentId"
          value={documentId}
          onChange={setDocumentId}
        />
        <Field
          label="Document version ID"
          name="documentVersionId"
          value={documentVersionId}
          onChange={setDocumentVersionId}
        />
        <div className="form-actions">
          <button type="submit">Link evidence</button>
          {message ? <p className="notice">{message}</p> : null}
        </div>
      </form>

      <section className="table-section">
        <h2>Linked evidence</h2>
        {items.length ? (
          <div className="data-table data-table--evidence">
            {items.map((item) => (
              <article key={item.id}>
                <strong>{item.label}</strong>
                <span>
                  {item.entityType} / {item.entityId}
                </span>
                <span>{item.document?.title ?? item.evidenceType}</span>
                <span>{new Date(item.createdAt).toLocaleString()}</span>
              </article>
            ))}
          </div>
        ) : (
          <EmptyNotice>No evidence items found.</EmptyNotice>
        )}
      </section>
    </>
  )
}

function EvidencePacksScreen({ session }: { session: AppSession }) {
  const [projects, setProjects] = useState<Project[]>([])
  const [packs, setPacks] = useState<EvidencePack[]>([])
  const [projectId, setProjectId] = useState('')
  const [title, setTitle] = useState('Project procurement evidence pack')
  const [message, setMessage] = useState<string | null>(null)
  const [lastHash, setLastHash] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!session.organizationId) {
      return { projectRows: [], packRows: [] }
    }

    const [projectRows, packRows] = await Promise.all([
      apiRequest<Project[]>(`/projects?${organizationQuery(session)}`),
      apiRequest<EvidencePack[]>(`/evidence-packs?${organizationQuery(session)}`),
    ])

    return { projectRows, packRows }
  }, [session])

  async function refresh() {
    const data = await loadData()
    setProjects(data.projectRows)
    setPacks(data.packRows)
  }

  useEffect(() => {
    let cancelled = false

    loadData()
      .then((data) => {
        if (!cancelled) {
          setProjects(data.projectRows)
          setPacks(data.packRows)
          setProjectId((current) => current || data.projectRows[0]?.id || '')
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setMessage(
            error instanceof Error
              ? error.message
              : 'Unable to load evidence packs',
          )
        }
      })

    return () => {
      cancelled = true
    }
  }, [loadData])

  async function createPack(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage(null)
    setLastHash(null)

    try {
      await apiRequest<EvidencePack>('/evidence-packs', {
        method: 'POST',
        body: JSON.stringify(
          scopedBody(session, {
            projectId,
            title,
          }),
        ),
      })
      await refresh()
      setMessage('Evidence pack generated')
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Unable to create evidence pack',
      )
    }
  }

  async function exportPack(id: string) {
    setMessage(null)
    setLastHash(null)

    try {
      const exported = await apiRequest<{
        hashRecord: HashRecord
      }>(`/evidence-packs/${id}/export`, {
        method: 'POST',
        body: JSON.stringify({
          actorUserId: session.actorUserId,
        }),
      })
      await refresh()
      setLastHash(exported.hashRecord.canonicalHash)
      setMessage('Evidence pack exported')
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Unable to export evidence pack',
      )
    }
  }

  return (
    <>
      <PageHeader eyebrow="Evidence pack" title="Project evidence packs" />
      <form className="form-grid" onSubmit={(event) => void createPack(event)}>
        <h2>Generate pack</h2>
        <label className="field">
          <span>Procurement project</span>
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
        <Field label="Title" name="title" required value={title} onChange={setTitle} />
        <div className="form-actions">
          <button type="submit" disabled={!projects.length}>
            Generate pack
          </button>
          {message ? <p className="notice">{message}</p> : null}
        </div>
      </form>

      {lastHash ? <p className="notice hash-text">Export hash: {lastHash}</p> : null}

      <section className="table-section">
        <h2>Evidence packs</h2>
        {packs.length ? (
          <div className="data-table data-table--actions">
            {packs.map((pack) => (
              <article key={pack.id}>
                <strong>{pack.title}</strong>
                <span>{pack.items?.length ?? 0} evidence items</span>
                <StatusTag status={pack.status} />
                <span>{pack.summary?.counts?.invoices ?? 0} invoices</span>
                <div className="inline-actions">
                  <button type="button" onClick={() => void exportPack(pack.id)}>
                    Export
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyNotice>No evidence packs found.</EmptyNotice>
        )}
      </section>
    </>
  )
}

function HashRecordsScreen({ session }: { session: AppSession }) {
  const [entityType, setEntityType] = useState('PurchaseOrder')
  const [entityId, setEntityId] = useState('')
  const [record, setRecord] = useState<HashRecord | null>(null)
  const [verification, setVerification] = useState<HashVerification | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  async function createHash(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage(null)
    setVerification(null)

    try {
      const created = await apiRequest<HashRecord>('/hash-records', {
        method: 'POST',
        body: JSON.stringify(
          scopedBody(session, {
            entityType,
            entityId,
          }),
        ),
      })
      setRecord(created)
      setMessage('Hash record created')
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Unable to create hash record',
      )
    }
  }

  async function verifyHash() {
    if (!record) {
      return
    }

    const result = await apiRequest<HashVerification>(
      `/hash-records/${record.id}/verify`,
    )
    setVerification(result)
  }

  return (
    <>
      <PageHeader eyebrow="Local integrity" title="Hash records" />
      <form className="form-grid" onSubmit={(event) => void createHash(event)}>
        <h2>Create canonical hash</h2>
        <Field
          label="Entity type"
          name="entityType"
          required
          value={entityType}
          onChange={setEntityType}
        />
        <Field
          label="Entity ID"
          name="entityId"
          required
          value={entityId}
          onChange={setEntityId}
        />
        <div className="form-actions">
          <button type="submit">Create hash</button>
          <button type="button" disabled={!record} onClick={() => void verifyHash()}>
            Verify
          </button>
          {message ? <p className="notice">{message}</p> : null}
        </div>
      </form>

      <section className="table-section">
        <h2>Current hash</h2>
        {record ? (
          <div className="data-table data-table--evidence">
            <article>
              <strong>{record.entityType}</strong>
              <span>{record.entityId}</span>
              <span>{record.hashAlgorithm}</span>
              <span className="hash-text">{record.canonicalHash}</span>
            </article>
          </div>
        ) : (
          <EmptyNotice>No hash record created in this session.</EmptyNotice>
        )}
        {verification ? (
          <p className="notice">
            Verification: {verification.valid ? 'valid' : 'changed'} via{' '}
            {verification.source}
          </p>
        ) : null}
      </section>
    </>
  )
}

function EntityTimelineScreen({ session }: { session: AppSession }) {
  const [entityType, setEntityType] = useState(
    () => new URLSearchParams(window.location.search).get('entityType') || 'PurchaseOrder',
  )
  const [entityId, setEntityId] = useState(
    () => new URLSearchParams(window.location.search).get('entityId') || '',
  )
  const [events, setEvents] = useState<AuditEvent[]>([])
  const [message, setMessage] = useState<string | null>(null)

  const requestTimeline = useCallback(() => {
    if (!entityId) {
      return Promise.resolve([])
    }

    return apiRequest<AuditEvent[]>(
      `/audit-events/entity/${encodeURIComponent(entityType)}/${encodeURIComponent(
        entityId,
      )}?${organizationQuery(session)}`,
    )
  }, [entityId, entityType, session])

  useEffect(() => {
    let cancelled = false

    requestTimeline()
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
  }, [requestTimeline])

  async function loadTimeline(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage(null)

    try {
      setEvents(await requestTimeline())
      setMessage('Timeline loaded')
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Unable to load timeline',
      )
    }
  }

  return (
    <>
      <PageHeader eyebrow="Audit context" title="Entity timeline" />
      <form className="form-grid" onSubmit={(event) => void loadTimeline(event)}>
        <h2>Load timeline</h2>
        <Field
          label="Entity type"
          name="entityType"
          required
          value={entityType}
          onChange={setEntityType}
        />
        <Field
          label="Entity ID"
          name="entityId"
          required
          value={entityId}
          onChange={setEntityId}
        />
        <div className="form-actions">
          <button type="submit">Load timeline</button>
          {message ? <p className="notice">{message}</p> : null}
        </div>
      </form>

      <section className="table-section">
        <h2>Audit timeline</h2>
        {events.length ? (
          <div className="data-table data-table--audit">
            {events.map((event) => (
              <article key={event.id}>
                <strong>{event.eventType}</strong>
                <span>{event.entityType ?? 'System'}</span>
                <span>{event.actorUser?.displayName ?? 'System'}</span>
                <span>{new Date(event.createdAt).toLocaleString()}</span>
              </article>
            ))}
          </div>
        ) : (
          <EmptyNotice>No audit events loaded.</EmptyNotice>
        )}
      </section>
    </>
  )
}

export function EvidenceRoute({ path, session }: EvidenceRouteProps) {
  if (path === '/evidence/documents') {
    return <DocumentsScreen session={session} />
  }

  if (path === '/evidence/items') {
    return <EvidenceItemsScreen session={session} />
  }

  if (path === '/evidence/packs') {
    return <EvidencePacksScreen session={session} />
  }

  if (path === '/evidence/hashes') {
    return <HashRecordsScreen session={session} />
  }

  if (path === '/evidence/timeline') {
    return <EntityTimelineScreen session={session} />
  }

  return null
}
