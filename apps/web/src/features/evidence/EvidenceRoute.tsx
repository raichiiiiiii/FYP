import { useCallback, useEffect, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { Link, Route, Routes, useParams } from 'react-router-dom'

import { PageHeader as SharedPageHeader } from '../../layouts/PageHeader'
import { EmptyState } from '../../shared/components/EmptyState'
import { Field as SharedField } from '../../shared/components/Field'
import { StatusBadge } from '../../shared/components/StatusBadge'
import { TextAreaField as SharedTextAreaField } from '../../shared/components/FormField'
import { formatDateTime } from '../../shared/utils/formatting'
import { useProjects } from '../procurement/api/useProjects'
import { useAuditTimeline } from './api/useAuditTimeline'
import { useDocuments } from './api/useDocuments'
import { useEvidenceItems } from './api/useEvidenceItems'
import { useEvidencePacks } from './api/useEvidencePacks'
import { useHashRecords } from './api/useHashRecords'

type AppSession = {
  organizationId: string | null
  actorUserId: string | null
}

type EvidenceRouteProps = {
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
  sizeBytes?: number | null
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
  description?: string | null
  versions?: DocumentVersion[]
  evidenceItems?: EvidenceItem[]
}

type EvidenceItem = {
  id: string
  entityType: string
  entityId: string
  label: string
  evidenceType: string
  documentId?: string | null
  documentVersionId?: string | null
  document?: DocumentRecord | null
  documentVersion?: DocumentVersion | null
  evidencePack?: Pick<EvidencePack, 'id' | 'title' | 'status'> | null
  createdAt: string
}

type EvidencePack = {
  id: string
  title: string
  projectId?: string | null
  project?: Project | null
  status: string
  summary?: {
    counts?: Record<string, number>
  } | null
  exportedAt?: string | null
  items?: EvidenceItem[]
}

type HashRecord = {
  id: string
  organizationId?: string | null
  entityType: string
  entityId: string
  hashAlgorithm: string
  canonicalHash: string
  canonicalText?: string
  createdAt: string
  verifiedAt?: string | null
  anchorStatus?: AnchorStatus
}

type HashVerification = {
  id: string
  entityType: string
  entityId: string
  valid: boolean
  storedHash: string
  computedHash: string
  source: string
  anchorStatus?: AnchorStatus
}

type FabricVerification = {
  id: string
  entityType: string
  entityId: string
  verificationStatus: string
  verified: boolean
  reviewerSummary: string
  localHash: {
    algorithm: string
    storedHash: string
    computedHash: string
    match: boolean
    source: string
  }
  fabric: {
    chaincodeQueryAvailable: boolean
    chaincodeHashMatch: boolean | null
    chaincodeVerificationStatus: string
    anchor?: AnchorStatus | null
    outboxEvent?: {
      id: string
      status: string
      attempts: number
      lastError?: string | null
      idempotencyKey?: string | null
      processedAt?: string | null
      createdAt: string
    } | null
    reconciliation?: {
      id: string
      status: string
      externalReference?: string | null
      lastError?: string | null
      attempts: number
      updatedAt: string
    } | null
  }
}

type AnchorStatus = {
  status: string
  anchorType: string
  outboxStatus?: string
  attempts?: number
  requestedAt?: string
  anchoredAt?: string | null
  rootHash?: string
  fabricTransactionId?: string | null
  fabricBlockNumber?: number | null
  fabricChannel?: string | null
  fabricChaincode?: string | null
  fabricCommitStatus?: string | null
  fabricEndorsementStatus?: string | null
  fabricVerifiedAt?: string | null
}

type DocumentPreview = {
  fileName: string
  mimeType: string
  sizeBytes: number
  storageUri?: string | null
  contentHash?: string | null
  previewText: string
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
    <SharedTextAreaField
      label={label}
      name={name}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  )
}

function EmptyNotice({ children }: { children: ReactNode }) {
  return <EmptyState>{children}</EmptyState>
}

function StatusTag({ status }: { status: string }) {
  return <StatusBadge status={status} />
}

function entityPathFor(entityType?: string | null, entityId?: string | null) {
  if (!entityType || !entityId) {
    return null
  }

  const procurementPaths: Record<string, string> = {
    Requisition: `/procurement/requisitions/${entityId}`,
    Supplier: `/procurement/suppliers/${entityId}`,
    RFQ: `/procurement/rfqs/${entityId}`,
    PurchaseOrder: `/procurement/purchase-orders/${entityId}`,
    EvidencePack: `/evidence/packs/${entityId}`,
    Document: `/evidence/documents/${entityId}`,
    HashRecord: `/evidence/hashes/${entityId}`,
  }

  return (
    procurementPaths[entityType] ??
    `/audit/entity/${encodeURIComponent(entityType)}/${encodeURIComponent(entityId)}`
  )
}

function latestVersion(document: DocumentRecord) {
  return document.versions?.[0] ?? null
}

async function fileToBase64(file: File) {
  const buffer = await file.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  let binary = ''

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })

  return window.btoa(binary)
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.click()
  URL.revokeObjectURL(url)
}

function AnchorStatusPanel({ anchorStatus }: { anchorStatus?: AnchorStatus }) {
  const reviewerNote = anchorStatus
    ? anchorReviewerNote(anchorStatus)
    : 'No anchor request exists. This record can still be locally hashed, but it has no external anchor state.'

  return (
    <section className="table-section">
      <div className="section-heading-row">
        <div>
          <h2>Anchor and outbox status</h2>
          <p>
            Fabric anchoring starts as an adapter-backed outbox request. Mock
            adapter results are marked explicitly and are not the same as real
            Fabric Gateway verification.
          </p>
        </div>
        <Link to="/integrations">Open outbox</Link>
      </div>
      {anchorStatus ? (
        <div className="details-grid">
          <article>
            <span>Status</span>
            <strong>{anchorStatus.status}</strong>
          </article>
          <article>
            <span>Anchor type</span>
            <strong>{anchorStatus.anchorType}</strong>
          </article>
          <article>
            <span>Outbox status</span>
            <strong>{anchorStatus.outboxStatus ?? 'Not queued'}</strong>
          </article>
          <article>
            <span>Attempts</span>
            <strong>{anchorStatus.attempts ?? 0}</strong>
          </article>
          {anchorStatus.rootHash ? (
            <article className="wide">
              <span>Anchored hash</span>
              <strong className="hash-text">{anchorStatus.rootHash}</strong>
            </article>
          ) : null}
          {anchorStatus.fabricTransactionId ? (
            <article className="wide">
              <span>Fabric transaction</span>
              <strong className="hash-text">
                {anchorStatus.fabricTransactionId}
              </strong>
            </article>
          ) : null}
          {anchorStatus.fabricChannel || anchorStatus.fabricChaincode ? (
            <article>
              <span>Fabric channel / chaincode</span>
              <strong>
                {anchorStatus.fabricChannel ?? 'Unknown channel'} /{' '}
                {anchorStatus.fabricChaincode ?? 'Unknown chaincode'}
              </strong>
            </article>
          ) : null}
          {anchorStatus.fabricCommitStatus ? (
            <article>
              <span>Commit status</span>
              <strong>{anchorStatus.fabricCommitStatus}</strong>
            </article>
          ) : null}
          {anchorStatus.requestedAt ? (
            <article>
              <span>Requested</span>
              <strong>{formatDateTime(anchorStatus.requestedAt)}</strong>
            </article>
          ) : null}
          {anchorStatus.anchoredAt ? (
            <article>
              <span>Anchored at</span>
              <strong>{formatDateTime(anchorStatus.anchoredAt)}</strong>
            </article>
          ) : null}
          <article>
            <span>Reviewer note</span>
            <strong>{reviewerNote}</strong>
          </article>
        </div>
      ) : (
        <EmptyNotice>{reviewerNote}</EmptyNotice>
      )}
    </section>
  )
}

function anchorReviewerNote(anchorStatus: AnchorStatus) {
  const normalized = anchorStatus.status.trim().toUpperCase()
  const outboxStatus = anchorStatus.outboxStatus?.trim().toUpperCase()

  if (normalized === 'ANCHORED_MOCK') {
    return 'Mock adapter completed a local anchor simulation. Treat this as adapter evidence only, not real Fabric verification.'
  }

  if (normalized === 'ANCHORED' || normalized === 'VERIFIED') {
    return 'Backend anchor metadata indicates verification evidence is available. Confirm the hash and transaction reference before relying on it.'
  }

  if (normalized === 'FAILED' || outboxStatus === 'FAILED') {
    return 'Anchor processing failed and needs retry or operator review.'
  }

  if (outboxStatus === 'RETRYING') {
    return 'Anchor processing is retrying through the worker. Do not treat it as anchored yet.'
  }

  return 'Anchor work is pending or not yet verified. Local hash evidence remains available for review.'
}

function FabricVerificationPanel({
  result,
}: {
  result: FabricVerification | null
}) {
  if (!result) {
    return (
      <section className="table-section">
        <h2>Fabric verification result</h2>
        <EmptyNotice>
          Run Fabric verification to compare the local canonical hash with stored
          anchor metadata. This does not query chaincode unless the backend
          explicitly reports that chaincode query is available.
        </EmptyNotice>
      </section>
    )
  }

  const anchor = result.fabric.anchor
  const outbox = result.fabric.outboxEvent
  const reconciliation = result.fabric.reconciliation
  const chaincodeNote = result.fabric.chaincodeQueryAvailable
    ? 'Chaincode query path is available for this verification.'
    : 'Direct chaincode query is not available from this API yet; stored metadata alone is not full on-chain proof.'

  return (
    <section className="table-section">
      <div className="section-heading-row">
        <div>
          <h2>Fabric verification result</h2>
          <p>
            This panel is API-backed. Mock anchors, pending work, failed
            attempts, and unavailable Fabric are never displayed as real verified
            Fabric proof.
          </p>
        </div>
        <Link to="/integrations">Review integration state</Link>
      </div>
      <div className="details-grid">
        <article>
          <span>Status</span>
          <strong>{result.verificationStatus}</strong>
        </article>
        <article>
          <span>Verified</span>
          <strong>{result.verified ? 'Yes' : 'No'}</strong>
        </article>
        <article>
          <span>Local hash match</span>
          <strong>{result.localHash.match ? 'Matches' : 'Mismatch'}</strong>
        </article>
        <article>
          <span>Hash source</span>
          <strong>{result.localHash.source}</strong>
        </article>
        <article className="wide">
          <span>Reviewer summary</span>
          <strong>{result.reviewerSummary}</strong>
        </article>
        <article className="wide">
          <span>Chaincode query</span>
          <strong>{chaincodeNote}</strong>
        </article>
        {anchor ? (
          <>
            <article>
              <span>Anchor type</span>
              <strong>{anchor.anchorType}</strong>
            </article>
            <article>
              <span>Anchor status</span>
              <strong>{anchor.status}</strong>
            </article>
            {anchor.fabricTransactionId ? (
              <article className="wide">
                <span>Fabric transaction</span>
                <strong className="hash-text">
                  {anchor.fabricTransactionId}
                </strong>
              </article>
            ) : null}
            {anchor.fabricChannel || anchor.fabricChaincode ? (
              <article>
                <span>Channel / chaincode</span>
                <strong>
                  {anchor.fabricChannel ?? 'Unknown channel'} /{' '}
                  {anchor.fabricChaincode ?? 'Unknown chaincode'}
                </strong>
              </article>
            ) : null}
          </>
        ) : null}
        {outbox ? (
          <article>
            <span>Outbox</span>
            <strong>
              {outbox.status}, attempts {outbox.attempts}
            </strong>
          </article>
        ) : null}
        {reconciliation ? (
          <article>
            <span>Reconciliation</span>
            <strong>{reconciliation.status}</strong>
          </article>
        ) : null}
        {outbox?.lastError || reconciliation?.lastError ? (
          <article className="wide">
            <span>Last error</span>
            <strong>{outbox?.lastError ?? reconciliation?.lastError}</strong>
          </article>
        ) : null}
      </div>
    </section>
  )
}

function DocumentsScreen({ session }: { session: AppSession }) {
  const { listDocuments, createDocument, uploadDocument } = useDocuments(session)
  const [title, setTitle] = useState('Supplier quotation PDF')
  const [documentType, setDocumentType] = useState('QUOTATION')
  const [linkedEntityType, setLinkedEntityType] = useState('Quotation')
  const [linkedEntityId, setLinkedEntityId] = useState('')
  const [fileName, setFileName] = useState('quotation.pdf')
  const [storageUri, setStorageUri] = useState('minio://mepn-evidence/quotation.pdf')
  const [canonicalContent, setCanonicalContent] = useState(
    '{"kind":"quotation","source":"local-registration"}',
  )
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [documents, setDocuments] = useState<DocumentRecord[]>([])
  const [document, setDocument] = useState<DocumentRecord | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const loadDocuments = useCallback(
    () => listDocuments<DocumentRecord>(),
    [listDocuments],
  )

  async function refresh() {
    setDocuments(await loadDocuments())
  }

  useEffect(() => {
    let cancelled = false

    loadDocuments()
      .then((rows) => {
        if (!cancelled) {
          setDocuments(rows)
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setMessage(
            error instanceof Error ? error.message : 'Unable to load documents',
          )
        }
      })

    return () => {
      cancelled = true
    }
  }, [loadDocuments])

  async function registerDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage(null)

    try {
      const created = selectedFile
        ? await uploadDocument<DocumentRecord>(
            scopedBody(session, {
              title,
              documentType,
              linkedEntityType,
              linkedEntityId: linkedEntityId || undefined,
              fileName: selectedFile.name,
              mimeType: selectedFile.type || 'application/octet-stream',
              contentBase64: await fileToBase64(selectedFile),
              metadata: {
                source: 'browser-upload',
              },
            }),
          )
        : await createDocument<DocumentRecord>(
            scopedBody(session, {
              title,
              documentType,
              linkedEntityType,
              linkedEntityId: linkedEntityId || undefined,
              version: {
                actorUserId: session.actorUserId,
                fileName,
                storageUri,
                canonicalContent: canonicalContent.trim()
                  ? JSON.parse(canonicalContent)
                  : undefined,
                metadata: {
                  source: 'local-registration',
                },
              },
            }),
          )
      setDocument(created)
      await refresh()
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
        <label className="field">
          <span>Upload file</span>
          <input
            type="file"
            onChange={(event) =>
              setSelectedFile(event.currentTarget.files?.[0] ?? null)
            }
          />
        </label>
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

      <section className="table-section">
        <h2>Document library</h2>
        {documents.length ? (
          <div className="data-table data-table--actions">
            {documents.map((row) => {
              const version = latestVersion(row)

              return (
                <article key={row.id}>
                  <strong>{row.title}</strong>
                  <span>{row.documentType}</span>
                  <span>{version?.fileName ?? 'No version'}</span>
                  <StatusTag status={row.status} />
                  <div className="inline-actions">
                    <Link to={`/evidence/documents/${row.id}`}>Open</Link>
                    {row.linkedEntityType && row.linkedEntityId ? (
                      <Link
                        to={
                          entityPathFor(row.linkedEntityType, row.linkedEntityId) ??
                          '/audit/search'
                        }
                      >
                        Source
                      </Link>
                    ) : null}
                  </div>
                </article>
              )
            })}
          </div>
        ) : (
          <EmptyNotice>No documents found.</EmptyNotice>
        )}
      </section>
    </>
  )
}

function DocumentDetailScreen({ session }: { session: AppSession }) {
  const { id = '' } = useParams()
  const {
    getDocument,
    uploadDocumentVersion,
    previewDocumentVersion,
    downloadDocumentVersion,
  } = useDocuments(session)
  const [documentRecord, setDocumentRecord] = useState<DocumentRecord | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<DocumentPreview | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const loadDocument = useCallback(
    () => getDocument<DocumentRecord>(id),
    [getDocument, id],
  )

  async function refresh() {
    setDocumentRecord(await loadDocument())
  }

  useEffect(() => {
    let cancelled = false

    loadDocument()
      .then((row) => {
        if (!cancelled) {
          setDocumentRecord(row)
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setMessage(
            error instanceof Error ? error.message : 'Unable to load document',
          )
        }
      })

    return () => {
      cancelled = true
    }
  }, [loadDocument])

  async function uploadVersion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!selectedFile) {
      setMessage('Choose a file before uploading a new version')
      return
    }

    setMessage(null)

    try {
      await uploadDocumentVersion<DocumentVersion>(id, {
        actorUserId: session.actorUserId,
        fileName: selectedFile.name,
        mimeType: selectedFile.type || 'application/octet-stream',
        contentBase64: await fileToBase64(selectedFile),
        metadata: {
          source: 'browser-version-upload',
        },
      })
      await refresh()
      setSelectedFile(null)
      setPreview(null)
      setMessage('Immutable document version uploaded')
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Unable to upload version',
      )
    }
  }

  async function previewLatest() {
    const version = documentRecord ? latestVersion(documentRecord) : null

    if (!version) {
      return
    }

    setPreview(await previewDocumentVersion<DocumentPreview>(id, version.id))
  }

  async function downloadLatest() {
    const version = documentRecord ? latestVersion(documentRecord) : null

    if (!version) {
      return
    }

    const result = await downloadDocumentVersion(id, version.id)
    downloadBlob(result.blob, result.fileName)
    setMessage('Document download prepared')
  }

  const version = documentRecord ? latestVersion(documentRecord) : null

  return (
    <>
      <PageHeader eyebrow="Evidence registry" title="Document detail" />
      {message ? <p className="notice">{message}</p> : null}
      {documentRecord ? (
        <>
          <section className="details-grid">
            <article>
              <span>Title</span>
              <strong>{documentRecord.title}</strong>
            </article>
            <article>
              <span>Type</span>
              <strong>{documentRecord.documentType}</strong>
            </article>
            <article>
              <span>Latest version</span>
              <strong>{version ? `v${version.versionNumber}` : 'No version'}</strong>
            </article>
            <article>
              <span>Linked source</span>
              <strong>
                {documentRecord.linkedEntityType && documentRecord.linkedEntityId ? (
                  <Link
                    to={
                      entityPathFor(
                        documentRecord.linkedEntityType,
                        documentRecord.linkedEntityId,
                      ) ?? '/audit/search'
                    }
                  >
                    {documentRecord.linkedEntityType}
                  </Link>
                ) : (
                  'Not linked'
                )}
              </strong>
            </article>
          </section>
          <section className="table-section">
            <h2>Latest file</h2>
            {version ? (
              <div className="data-table data-table--actions">
                <article>
                  <strong>{version.fileName}</strong>
                  <span>{version.mimeType ?? 'Unknown type'}</span>
                  <span>{version.sizeBytes ?? 0} bytes</span>
                  <span className="hash-text">{version.contentHash ?? 'No hash'}</span>
                  <div className="inline-actions">
                    <button type="button" onClick={() => void previewLatest()}>
                      Preview
                    </button>
                    <button type="button" onClick={() => void downloadLatest()}>
                      Download
                    </button>
                  </div>
                </article>
              </div>
            ) : (
              <EmptyNotice>No versions have been uploaded.</EmptyNotice>
            )}
          </section>
          {preview ? (
            <section className="table-section">
              <h2>Preview</h2>
              <pre className="reviewer-preview">{preview.previewText}</pre>
            </section>
          ) : null}
          <form className="form-grid" onSubmit={(event) => void uploadVersion(event)}>
            <h2>Upload immutable version</h2>
            <label className="field">
              <span>New version file</span>
              <input
                type="file"
                onChange={(event) =>
                  setSelectedFile(event.currentTarget.files?.[0] ?? null)
                }
              />
            </label>
            <div className="form-actions">
              <button type="submit">Upload version</button>
            </div>
          </form>
          <section className="table-section">
            <h2>Version history</h2>
            {documentRecord.versions?.length ? (
              <div className="data-table data-table--evidence">
                {documentRecord.versions.map((row) => (
                  <article key={row.id}>
                    <strong>v{row.versionNumber}</strong>
                    <span>{row.fileName}</span>
                    <span>{formatDateTime(row.createdAt)}</span>
                    <span className="hash-text">{row.contentHash ?? 'No hash'}</span>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyNotice>No version history.</EmptyNotice>
            )}
          </section>
        </>
      ) : (
        <EmptyNotice>Loading document...</EmptyNotice>
      )}
    </>
  )
}

function EvidenceItemsScreen({ session }: { session: AppSession }) {
  const { listEvidenceItems, createEvidenceItem } = useEvidenceItems(session)
  const [items, setItems] = useState<EvidenceItem[]>([])
  const [entityType, setEntityType] = useState('PurchaseOrder')
  const [entityId, setEntityId] = useState('')
  const [documentId, setDocumentId] = useState('')
  const [documentVersionId, setDocumentVersionId] = useState('')
  const [label, setLabel] = useState('Purchase order evidence')
  const [message, setMessage] = useState<string | null>(null)

  const loadItems = useCallback(
    () => listEvidenceItems<EvidenceItem>(),
    [listEvidenceItems],
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
      await createEvidenceItem<EvidenceItem>(
        scopedBody(session, {
          entityType,
          entityId,
          label,
          evidenceType: 'SUPPORTING_DOCUMENT',
          documentId: documentId || undefined,
          documentVersionId: documentVersionId || undefined,
        }),
      )
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
                <span>{formatDateTime(item.createdAt)}</span>
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
  const { listProjects } = useProjects(session)
  const {
    listEvidencePacks,
    createEvidencePack,
    exportEvidencePack,
  } = useEvidencePacks(session)
  const [projects, setProjects] = useState<Project[]>([])
  const [packs, setPacks] = useState<EvidencePack[]>([])
  const [projectId, setProjectId] = useState('')
  const [title, setTitle] = useState('Project procurement evidence pack')
  const [message, setMessage] = useState<string | null>(null)
  const [lastHash, setLastHash] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    const [projectRows, packRows] = await Promise.all([
      listProjects<Project>(),
      listEvidencePacks<EvidencePack>(),
    ])

    return { projectRows, packRows }
  }, [listEvidencePacks, listProjects])

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
      await createEvidencePack<EvidencePack>(
        scopedBody(session, {
          projectId,
          title,
        }),
      )
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
      const exported = await exportEvidencePack<{
        hashRecord: HashRecord
      }>(id, {
        actorUserId: session.actorUserId,
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
                  <Link to={`/evidence/packs/${pack.id}`}>Open</Link>
                  <Link to={`/evidence/packs/${pack.id}/export`}>Download</Link>
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

function EvidencePackDetailScreen({ session }: { session: AppSession }) {
  const { id = '' } = useParams()
  const { getEvidencePack } = useEvidencePacks(session)
  const { listAuditTimeline } = useAuditTimeline(session)
  const [pack, setPack] = useState<EvidencePack | null>(null)
  const [events, setEvents] = useState<AuditEvent[]>([])
  const [message, setMessage] = useState<string | null>(null)

  const loadPack = useCallback(
    async () => {
      const [packRow, timelineRows] = await Promise.all([
        getEvidencePack<EvidencePack>(id),
        listAuditTimeline<AuditEvent>('EvidencePack', id),
      ])

      return { packRow, timelineRows }
    },
    [getEvidencePack, id, listAuditTimeline],
  )

  useEffect(() => {
    let cancelled = false

    loadPack()
      .then((data) => {
        if (!cancelled) {
          setPack(data.packRow)
          setEvents(data.timelineRows)
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setMessage(
            error instanceof Error ? error.message : 'Unable to load evidence pack',
          )
        }
      })

    return () => {
      cancelled = true
    }
  }, [loadPack])

  return (
    <>
      <PageHeader
        eyebrow="Evidence pack"
        title="Evidence pack detail"
        action={<Link to={`/evidence/packs/${id}/export`}>Export</Link>}
      />
      {message ? <p className="notice">{message}</p> : null}
      {pack ? (
        <>
          <section className="details-grid">
            <article>
              <span>Title</span>
              <strong>{pack.title}</strong>
            </article>
            <article>
              <span>Status</span>
              <strong>{pack.status}</strong>
            </article>
            <article>
              <span>Project</span>
              <strong>{pack.project?.name ?? 'Not linked'}</strong>
            </article>
            <article>
              <span>Exported at</span>
              <strong>{pack.exportedAt ? formatDateTime(pack.exportedAt) : 'Pending'}</strong>
            </article>
          </section>
          <section className="table-section">
            <div className="section-heading-row">
              <div>
                <h2>Reviewer evidence summary</h2>
                <p>
                  This pack is a review dossier. Export creates a local pack hash;
                  Fabric anchoring remains visible through hash and audit screens.
                </p>
              </div>
              <Link to="/evidence/hashes">Review hashes</Link>
            </div>
            <div className="data-table data-table--evidence">
              {Object.entries(pack.summary?.counts ?? {}).length ? (
                Object.entries(pack.summary?.counts ?? {}).map(([label, value]) => (
                  <article key={label}>
                    <strong>{label}</strong>
                    <span>{value}</span>
                  </article>
                ))
              ) : (
                <article>
                  <strong>No summary counts</strong>
                  <span>
                    Pack items are still listed below. Backend summary fields are
                    required for richer reviewer metrics.
                  </span>
                </article>
              )}
            </div>
          </section>
          <section className="table-section">
            <h2>Included evidence</h2>
            {pack.items?.length ? (
              <div className="data-table data-table--actions">
                {pack.items.map((item) => (
                  <article key={item.id}>
                    <strong>{item.label}</strong>
                    <span>{item.evidenceType}</span>
                    <span>
                      {item.entityType} / {item.entityId}
                    </span>
                    <div className="inline-actions">
                      <Link
                        to={entityPathFor(item.entityType, item.entityId) ?? '/audit/search'}
                      >
                        Source
                      </Link>
                      {item.documentId ? (
                        <Link to={`/evidence/documents/${item.documentId}`}>
                          Document
                        </Link>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyNotice>No evidence items included.</EmptyNotice>
            )}
          </section>
          <section className="table-section">
            <h2>Pack audit timeline</h2>
            {events.length ? (
              <div className="data-table data-table--audit">
                {events.map((event) => (
                  <article key={event.id}>
                    <strong>{event.eventType}</strong>
                    <span>{event.entityType ?? 'EvidencePack'}</span>
                    <span>{event.actorUser?.displayName ?? 'System'}</span>
                    <span>{formatDateTime(event.createdAt)}</span>
                    {event.entityType && event.entityId ? (
                      <Link
                        to={
                          entityPathFor(event.entityType, event.entityId) ??
                          '/audit/search'
                        }
                      >
                        Source
                      </Link>
                    ) : (
                      <Link to={`/audit/entity/EvidencePack/${id}`}>
                        Pack timeline
                      </Link>
                    )}
                  </article>
                ))}
              </div>
            ) : (
              <EmptyNotice>No pack audit events yet.</EmptyNotice>
            )}
          </section>
        </>
      ) : (
        <EmptyNotice>Loading evidence pack...</EmptyNotice>
      )}
    </>
  )
}

function EvidencePackExportScreen({ session }: { session: AppSession }) {
  const { id = '' } = useParams()
  const { getEvidencePack, downloadEvidencePackExport } = useEvidencePacks(session)
  const [pack, setPack] = useState<EvidencePack | null>(null)
  const [format, setFormat] = useState<'json' | 'pdf'>('json')
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    getEvidencePack<EvidencePack>(id)
      .then((row) => {
        if (!cancelled) {
          setPack(row)
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setMessage(
            error instanceof Error ? error.message : 'Unable to load evidence pack',
          )
        }
      })

    return () => {
      cancelled = true
    }
  }, [getEvidencePack, id])

  async function downloadExport() {
    setMessage(null)

    try {
      const result = await downloadEvidencePackExport(id, format)
      downloadBlob(result.blob, result.fileName)
      setMessage(
        format === 'pdf'
          ? 'Evidence pack PDF export ready'
          : 'Evidence pack JSON export ready',
      )
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Unable to export evidence pack',
      )
    }
  }

  return (
    <>
      <PageHeader eyebrow="Evidence export" title="Export evidence pack" />
      {message ? <p className="notice">{message}</p> : null}
      <section className="details-grid">
        <article>
          <span>Pack</span>
          <strong>{pack?.title ?? id}</strong>
        </article>
        <article>
          <span>Status</span>
          <strong>{pack?.status ?? 'Loading'}</strong>
        </article>
      </section>
      <form className="form-grid" onSubmit={(event) => event.preventDefault()}>
        <h2>Download artifact</h2>
        <label className="field">
          <span>Format</span>
          <select
            value={format}
            onChange={(event) => setFormat(event.target.value as 'json' | 'pdf')}
          >
            <option value="json">Reviewer JSON</option>
            <option value="pdf">Reviewer PDF</option>
          </select>
        </label>
        <div className="form-actions">
          <button type="button" onClick={() => void downloadExport()}>
            Download export
          </button>
        </div>
      </form>
    </>
  )
}

function HashRecordsScreen({ session }: { session: AppSession }) {
  const { createHashRecord, verifyHashRecord } = useHashRecords(session)
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
      const created = await createHashRecord<HashRecord>(
        scopedBody(session, {
          entityType,
          entityId,
        }),
      )
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

    const result = await verifyHashRecord<HashVerification>(record.id)
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
              <Link to={`/evidence/hashes/${record.id}`}>Open hash detail</Link>
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

function HashRecordDetailScreen({ session }: { session: AppSession }) {
  const { id = '' } = useParams()
  const { getHashRecord, verifyFabricAnchor, verifyHashRecord } =
    useHashRecords(session)
  const [record, setRecord] = useState<HashRecord | null>(null)
  const [verification, setVerification] = useState<HashVerification | null>(null)
  const [fabricVerification, setFabricVerification] =
    useState<FabricVerification | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const loadRecord = useCallback(
    () => getHashRecord<HashRecord>(id),
    [getHashRecord, id],
  )

  useEffect(() => {
    let cancelled = false

    loadRecord()
      .then((row) => {
        if (!cancelled) {
          setRecord(row)
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setMessage(error instanceof Error ? error.message : 'Unable to load hash')
        }
      })

    return () => {
      cancelled = true
    }
  }, [loadRecord])

  async function verify() {
    setMessage(null)

    try {
      const result = await verifyHashRecord<HashVerification>(id)
      setVerification(result)
      setMessage(result.valid ? 'Hash verification passed' : 'Hash changed')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to verify hash')
    }
  }

  async function verifyFabric() {
    setMessage(null)

    try {
      const result = await verifyFabricAnchor<FabricVerification>(id)
      setFabricVerification(result)
      setMessage('Fabric verification state loaded')
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Unable to verify Fabric anchor',
      )
    }
  }

  const anchorStatus = verification?.anchorStatus ?? record?.anchorStatus

  return (
    <>
      <PageHeader eyebrow="Local integrity" title="Hash verification detail" />
      {message ? <p className="notice">{message}</p> : null}
      {record ? (
        <>
          <section className="details-grid">
            <article>
              <span>Entity</span>
              <strong>
                {record.entityType} / {record.entityId}
              </strong>
            </article>
            <article>
              <span>Algorithm</span>
              <strong>{record.hashAlgorithm}</strong>
            </article>
            <article className="wide">
              <span>Stored hash</span>
              <strong className="hash-text">{record.canonicalHash}</strong>
            </article>
            <article>
              <span>Reviewer result</span>
              <strong>
                {verification
                  ? verification.valid
                    ? 'The live record matches this hash.'
                    : 'The live record no longer matches this hash.'
                  : 'Run verification to compare the stored hash with the live record.'}
              </strong>
            </article>
          </section>
          <div className="inline-actions">
            <button type="button" onClick={() => void verify()}>
              Verify hash
            </button>
            <button type="button" onClick={() => void verifyFabric()}>
              Verify Fabric anchor
            </button>
            <Link to={entityPathFor(record.entityType, record.entityId) ?? '/audit/search'}>
              Open source record
            </Link>
          </div>
          {verification ? (
            <section className="table-section">
              <h2>Verification comparison</h2>
              <div className="data-table data-table--evidence">
                <article>
                  <strong>Stored</strong>
                  <span className="hash-text">{verification.storedHash}</span>
                </article>
                <article>
                  <strong>Computed</strong>
                  <span className="hash-text">{verification.computedHash}</span>
                </article>
              </div>
            </section>
          ) : null}
          <AnchorStatusPanel anchorStatus={anchorStatus} />
          <FabricVerificationPanel result={fabricVerification} />
        </>
      ) : (
        <EmptyNotice>Loading hash record...</EmptyNotice>
      )}
    </>
  )
}

function EntityTimelineScreen({ session }: { session: AppSession }) {
  const { listAuditTimeline } = useAuditTimeline(session)
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

    return listAuditTimeline<AuditEvent>(entityType, entityId)
  }, [entityId, entityType, listAuditTimeline])

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
                <span>{formatDateTime(event.createdAt)}</span>
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

export function EvidenceRoute({ session }: EvidenceRouteProps) {
  return (
    <Routes>
      <Route path="documents" element={<DocumentsScreen session={session} />} />
      <Route
        path="documents/:id"
        element={<DocumentDetailScreen session={session} />}
      />
      <Route path="items" element={<EvidenceItemsScreen session={session} />} />
      <Route path="packs" element={<EvidencePacksScreen session={session} />} />
      <Route
        path="packs/:id"
        element={<EvidencePackDetailScreen session={session} />}
      />
      <Route
        path="packs/:id/export"
        element={<EvidencePackExportScreen session={session} />}
      />
      <Route path="hashes" element={<HashRecordsScreen session={session} />} />
      <Route
        path="hashes/:id"
        element={<HashRecordDetailScreen session={session} />}
      />
      <Route
        path="timeline"
        element={<EntityTimelineScreen session={session} />}
      />
      <Route path="*" element={null} />
    </Routes>
  )
}
