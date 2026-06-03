import type { AuditEvent } from '../../../shared/types'
import type {
  AnchorStatusSummary,
  FabricAnchorStatus,
  OutboxDisplayStatus,
  VerifiableAuditEvent,
} from './auditVerification.types'

const ANCHOR_STATUSES: FabricAnchorStatus[] = [
  'not_required',
  'pending',
  'submitted',
  'verified',
  'failed',
  'unavailable',
]

const STATUS_LABELS: Record<FabricAnchorStatus, string> = {
  not_required: 'Local audit event only',
  pending: 'Anchor pending',
  submitted: 'Anchor submitted',
  verified: 'Anchor verified',
  failed: 'Anchor failed',
  unavailable: 'Fabric unavailable',
}

const STATUS_DESCRIPTIONS: Record<FabricAnchorStatus, string> = {
  not_required:
    'A local immutable audit event exists, but no Fabric anchor was required or requested.',
  pending:
    'An anchor request is queued, processing, or retrying through the outbox worker.',
  submitted:
    'Hash or anchor metadata exists, but complete verification evidence is not available yet.',
  verified:
    'Backend metadata includes both a document hash and Fabric transaction reference.',
  failed:
    'The anchor request failed and requires retry or operator investigation.',
  unavailable:
    'The current environment cannot check Fabric anchor state.',
}

export function toVerifiableAuditEvent(event: AuditEvent): VerifiableAuditEvent {
  const metadata = asRecord(event.metadata)
  const payload = asRecord(metadata?.payload)
  const anchor = asRecord(metadata?.anchorStatus) ?? asRecord(metadata?.anchor)
  const reconciliation = asRecord(metadata?.reconciliationRecord)

  const documentHash = firstText([
    metadata?.documentHash,
    metadata?.canonicalHash,
    metadata?.contentHash,
    metadata?.hash,
    metadata?.rootHash,
    payload?.canonicalHash,
    payload?.documentHash,
    anchor?.rootHash,
  ])
  const fabricTransactionId = firstText([
    metadata?.fabricTransactionId,
    metadata?.transactionId,
    metadata?.txId,
    anchor?.fabricTransactionId,
    anchor?.transactionId,
    reconciliation?.externalReference,
  ])
  const fabricBlockNumber = firstText([
    metadata?.fabricBlockNumber,
    metadata?.blockNumber,
    anchor?.fabricBlockNumber,
    anchor?.blockNumber,
  ])
  const rawAnchorStatus = firstText([
    metadata?.fabricAnchorStatus,
    metadata?.anchorStatus,
    metadata?.anchor,
    metadata?.status,
    anchor?.status,
    reconciliation?.status,
  ])
  const outboxStatus = normalizeOutboxStatus(
    firstText([
      metadata?.outboxStatus,
      metadata?.displayStatus,
      anchor?.outboxStatus,
      reconciliation?.status,
      metadata?.status,
    ]),
    firstText([metadata?.lastError, anchor?.lastError, reconciliation?.lastError]),
  )
  const fabricAnchorStatus = normalizeAnchorStatus({
    eventType: event.eventType,
    rawAnchorStatus,
    outboxStatus,
    documentHash,
    fabricTransactionId,
  })

  return {
    id: event.id,
    eventType: event.eventType,
    actorId: event.actorUserId ?? event.actorUser?.id ?? 'system',
    actorDisplayName: event.actorUser?.displayName ?? 'System',
    organizationId: event.organizationId ?? event.organization?.id ?? 'unscoped',
    occurredAt: event.createdAt,
    businessObjectType: event.entityType ?? 'System',
    businessObjectId: event.entityId ?? event.id,
    summary: buildSummary(event, documentHash, fabricAnchorStatus),
    documentHash,
    hashAlgorithm: firstText([metadata?.hashAlgorithm, payload?.hashAlgorithm]),
    fabricTransactionId,
    fabricBlockNumber,
    fabricAnchorStatus,
    outboxStatus,
    outboxEventId: firstText([metadata?.outboxEventId, metadata?.correlationId]),
    verificationNote: verificationNoteFor(
      fabricAnchorStatus,
      documentHash,
      fabricTransactionId,
      outboxStatus,
    ),
  }
}

export function summarizeAnchorStatuses(
  events: AuditEvent[],
): AnchorStatusSummary[] {
  const counts = new Map<FabricAnchorStatus, number>(
    ANCHOR_STATUSES.map((status) => [status, 0]),
  )

  events.forEach((event) => {
    const status = toVerifiableAuditEvent(event).fabricAnchorStatus
    counts.set(status, (counts.get(status) ?? 0) + 1)
  })

  return ANCHOR_STATUSES.map((status) => ({
    status,
    label: STATUS_LABELS[status],
    count: counts.get(status) ?? 0,
  }))
}

export function anchorStatusLabel(status: FabricAnchorStatus) {
  return STATUS_LABELS[status]
}

export function anchorStatusDescription(status: FabricAnchorStatus) {
  return STATUS_DESCRIPTIONS[status]
}

export function anchorStatusCssClass(status: FabricAnchorStatus) {
  return `anchor-status anchor-status--${status}`
}

function normalizeAnchorStatus(input: {
  eventType: string
  rawAnchorStatus?: string
  outboxStatus: OutboxDisplayStatus
  documentHash?: string
  fabricTransactionId?: string
}): FabricAnchorStatus {
  const rawStatus = normalizeRawStatus(input.rawAnchorStatus)
  const hasVerificationEvidence = Boolean(
    input.documentHash && input.fabricTransactionId,
  )

  if (rawStatus === 'unavailable') {
    return 'unavailable'
  }

  if (rawStatus === 'failed' || input.outboxStatus === 'failed') {
    return 'failed'
  }

  if (rawStatus === 'verified') {
    return hasVerificationEvidence ? 'verified' : 'submitted'
  }

  if (rawStatus === 'submitted' || input.outboxStatus === 'completed') {
    return hasVerificationEvidence ? 'verified' : 'submitted'
  }

  if (
    rawStatus === 'pending' ||
    input.outboxStatus === 'pending' ||
    input.outboxStatus === 'processing' ||
    input.outboxStatus === 'retrying' ||
    input.eventType === 'FABRIC_ANCHOR_REQUESTED'
  ) {
    return 'pending'
  }

  if (input.documentHash) {
    return 'submitted'
  }

  return 'not_required'
}

function normalizeRawStatus(value?: string): FabricAnchorStatus | undefined {
  const status = value?.trim().toUpperCase()

  if (!status || status === 'NONE' || status === 'NOT_REQUESTED') {
    return 'not_required'
  }

  if (
    status === 'PENDING' ||
    status === 'QUEUED' ||
    status === 'REQUESTED' ||
    status === 'ANCHOR_REQUESTED'
  ) {
    return 'pending'
  }

  if (
    status === 'SUBMITTED' ||
    status === 'PROCESSING' ||
    status === 'COMMITTED' ||
    status === 'ANCHORED_MOCK'
  ) {
    return 'submitted'
  }

  if (status === 'VERIFIED' || status === 'ANCHORED') {
    return 'verified'
  }

  if (
    status === 'FAILED' ||
    status === 'ERROR' ||
    status === 'DEAD_LETTER' ||
    status === 'DEADLETTER'
  ) {
    return 'failed'
  }

  if (
    status === 'UNAVAILABLE' ||
    status === 'OFFLINE' ||
    status === 'FABRIC_UNAVAILABLE'
  ) {
    return 'unavailable'
  }

  return undefined
}

function normalizeOutboxStatus(
  value?: string,
  lastError?: string,
): OutboxDisplayStatus {
  const status = value?.trim().toUpperCase()

  if (lastError && (!status || status === 'PENDING')) {
    return 'retrying'
  }

  if (!status) {
    return 'none'
  }

  if (status === 'PENDING' || status === 'ANCHOR_REQUESTED') {
    return 'pending'
  }

  if (status === 'PROCESSING') {
    return 'processing'
  }

  if (status === 'COMPLETED') {
    return 'completed'
  }

  if (status === 'FAILED' || status === 'DEAD_LETTER') {
    return 'failed'
  }

  if (status === 'RETRYING') {
    return 'retrying'
  }

  return 'none'
}

function verificationNoteFor(
  status: FabricAnchorStatus,
  documentHash?: string,
  fabricTransactionId?: string,
  outboxStatus?: OutboxDisplayStatus,
) {
  if (status === 'verified') {
    return 'Hash and Fabric transaction reference are both present.'
  }

  if (status === 'submitted') {
    if (fabricTransactionId && !documentHash) {
      return 'Transaction reference exists, but no document hash is attached.'
    }

    if (documentHash && !fabricTransactionId) {
      return 'Hash exists, but Fabric transaction reference is not available yet.'
    }

    return 'Anchor was submitted, but verification evidence is incomplete.'
  }

  if (status === 'pending') {
    return outboxStatus === 'retrying'
      ? 'Anchor request is retrying after a worker failure.'
      : 'Anchor request is queued or awaiting worker processing.'
  }

  if (status === 'failed') {
    return 'Anchor attempt failed and requires retry or operator review.'
  }

  if (status === 'unavailable') {
    return 'Fabric status cannot be checked from the current environment.'
  }

  return documentHash
    ? 'Local hash evidence exists, but anchoring was not requested.'
    : 'This event is local audit evidence only.'
}

function buildSummary(
  event: AuditEvent,
  documentHash: string | undefined,
  status: FabricAnchorStatus,
) {
  const entity = event.entityType && event.entityId
    ? `${event.entityType} ${event.entityId}`
    : event.entityType ?? 'system event'
  const hashContext = documentHash ? 'with document hash' : 'without document hash'

  return `${event.eventType} for ${entity} ${hashContext}; ${STATUS_LABELS[status].toLowerCase()}.`
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }

  return undefined
}

function firstText(values: unknown[]) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      return String(value)
    }
  }

  return undefined
}
