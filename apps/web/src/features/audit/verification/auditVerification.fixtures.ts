import type { AuditEvent } from '../../../shared/types'

// Fixture/test data only. These rows exercise UI states when backend Fabric
// integration data is not available in local development.
export const auditVerificationFixtures = {
  localOnly: auditEvent({
    id: 'audit-local',
    eventType: 'REQUISITION_CREATED',
  }),
  pending: auditEvent({
    id: 'audit-pending',
    eventType: 'FABRIC_ANCHOR_REQUESTED',
    metadata: {
      status: 'PENDING',
      outboxEventId: 'outbox-pending',
      payload: {
        canonicalHash: 'hash-pending',
      },
    },
  }),
  submitted: auditEvent({
    id: 'audit-submitted',
    eventType: 'HASH_RECORD_CREATED',
    metadata: {
      canonicalHash: 'hash-submitted',
      anchorStatus: 'ANCHORED_MOCK',
    },
  }),
  verified: auditEvent({
    id: 'audit-verified',
    eventType: 'HASH_RECORD_CREATED',
    metadata: {
      canonicalHash: 'hash-verified',
      anchorStatus: 'ANCHORED',
      fabricTransactionId: 'fabric-tx-001',
      fabricBlockNumber: 42,
    },
  }),
  failed: auditEvent({
    id: 'audit-failed',
    eventType: 'FABRIC_ANCHOR_REQUESTED',
    metadata: {
      status: 'FAILED',
      outboxStatus: 'FAILED',
      canonicalHash: 'hash-failed',
    },
  }),
  unavailable: auditEvent({
    id: 'audit-unavailable',
    eventType: 'HASH_RECORD_CREATED',
    metadata: {
      canonicalHash: 'hash-unavailable',
      fabricAnchorStatus: 'FABRIC_UNAVAILABLE',
    },
  }),
  incompleteVerifiedClaim: auditEvent({
    id: 'audit-incomplete-verified',
    eventType: 'HASH_RECORD_CREATED',
    metadata: {
      anchorStatus: 'VERIFIED',
    },
  }),
} satisfies Record<string, AuditEvent>

function auditEvent(input: Partial<AuditEvent>): AuditEvent {
  return {
    id: input.id ?? 'audit-fixture',
    organizationId: input.organizationId ?? 'org-fixture',
    actorUserId: input.actorUserId ?? 'user-fixture',
    eventType: input.eventType ?? 'TEST_EVENT',
    entityType: input.entityType ?? 'PurchaseOrder',
    entityId: input.entityId ?? 'po-fixture',
    metadata: input.metadata ?? {},
    createdAt: input.createdAt ?? '2026-06-02T00:00:00.000Z',
    actorUser: input.actorUser ?? {
      id: 'user-fixture',
      email: 'fixture@example.test',
      displayName: 'Fixture Reviewer',
    },
  }
}
