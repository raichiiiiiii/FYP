import { describe, expect, it } from 'vitest'

import {
  anchorStatusLabel,
  summarizeAnchorStatuses,
  toVerifiableAuditEvent,
} from './auditVerification.model'
import { auditVerificationFixtures } from './auditVerification.fixtures'

describe('audit Fabric verification model', () => {
  it('keeps local audit events separate from Fabric verification', () => {
    const event = toVerifiableAuditEvent(auditVerificationFixtures.localOnly)

    expect(event.fabricAnchorStatus).toBe('not_required')
    expect(event.verificationNote).toContain('local audit evidence only')
  })

  it('shows pending anchors from outbox-backed Fabric requests', () => {
    const event = toVerifiableAuditEvent(auditVerificationFixtures.pending)

    expect(event.fabricAnchorStatus).toBe('pending')
    expect(event.outboxEventId).toBe('outbox-pending')
    expect(event.documentHash).toBe('hash-pending')
  })

  it('treats mock anchored metadata as submitted, not verified', () => {
    const event = toVerifiableAuditEvent(auditVerificationFixtures.submitted)

    expect(event.fabricAnchorStatus).toBe('submitted')
    expect(event.verificationNote).toContain('Fabric transaction reference is not available')
  })

  it('shows verified only when hash and Fabric transaction reference exist', () => {
    const event = toVerifiableAuditEvent(auditVerificationFixtures.verified)

    expect(event.fabricAnchorStatus).toBe('verified')
    expect(event.documentHash).toBe('hash-verified')
    expect(event.fabricTransactionId).toBe('fabric-tx-001')
    expect(anchorStatusLabel(event.fabricAnchorStatus)).toBe('Anchor verified')
  })

  it('shows failed anchors distinctly', () => {
    const event = toVerifiableAuditEvent(auditVerificationFixtures.failed)

    expect(event.fabricAnchorStatus).toBe('failed')
    expect(event.outboxStatus).toBe('failed')
    expect(event.verificationNote).toContain('requires retry')
  })

  it('shows Fabric unavailable distinctly', () => {
    const event = toVerifiableAuditEvent(auditVerificationFixtures.unavailable)

    expect(event.fabricAnchorStatus).toBe('unavailable')
    expect(event.verificationNote).toContain('cannot be checked')
  })

  it('does not imply verification when a verified status has no evidence', () => {
    const event = toVerifiableAuditEvent(
      auditVerificationFixtures.incompleteVerifiedClaim,
    )

    expect(event.fabricAnchorStatus).toBe('submitted')
    expect(event.fabricTransactionId).toBeUndefined()
    expect(event.documentHash).toBeUndefined()
  })

  it('summarizes all anchor states for dashboard display', () => {
    const summary = summarizeAnchorStatuses([
      auditVerificationFixtures.localOnly,
      auditVerificationFixtures.pending,
      auditVerificationFixtures.submitted,
      auditVerificationFixtures.verified,
      auditVerificationFixtures.failed,
      auditVerificationFixtures.unavailable,
    ])

    expect(summary).toEqual([
      { status: 'not_required', label: 'Local audit event only', count: 1 },
      { status: 'pending', label: 'Anchor pending', count: 1 },
      { status: 'submitted', label: 'Anchor submitted', count: 1 },
      { status: 'verified', label: 'Anchor verified', count: 1 },
      { status: 'failed', label: 'Anchor failed', count: 1 },
      { status: 'unavailable', label: 'Fabric unavailable', count: 1 },
    ])
  })
})
