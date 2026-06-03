export type FabricAnchorStatus =
  | 'not_required'
  | 'pending'
  | 'submitted'
  | 'verified'
  | 'failed'
  | 'unavailable'

export type OutboxDisplayStatus =
  | 'none'
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'retrying'

export type VerifiableAuditEvent = {
  id: string
  eventType: string
  actorId: string
  actorDisplayName: string
  organizationId: string
  occurredAt: string
  businessObjectType: string
  businessObjectId: string
  summary: string
  documentHash?: string
  hashAlgorithm?: string
  fabricTransactionId?: string
  fabricBlockNumber?: string
  fabricAnchorStatus: FabricAnchorStatus
  outboxStatus: OutboxDisplayStatus
  outboxEventId?: string
  verificationNote: string
}

export type AnchorStatusSummary = {
  status: FabricAnchorStatus
  label: string
  count: number
}
