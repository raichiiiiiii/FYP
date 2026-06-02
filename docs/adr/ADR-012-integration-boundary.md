# ADR-012: Integration Boundary and Mock Fabric Anchoring

## Status

Accepted

## Context

The SDD treats external systems as unreliable by default. Fabric, ERP, finance
APIs, e-signature, and webhook delivery should not block the internal MEPN
procurement, evidence, audit, or Mudarabah finance workflows.

## Decision

MEPN integrations will use adapter interfaces, durable outbox events,
idempotency keys, retry state, and reconciliation records.

Real integrations are deferred. The first implementation uses mock adapters for:

- Fabric anchoring
- ERP sync
- Finance API notification
- E-signature package creation
- Webhook delivery

Fabric starts with mock anchoring only. Hash records enqueue
`FABRIC_ANCHOR_REQUESTED`; the worker stores an `AuditAnchor` with
`ANCHORED_MOCK` status and a fake transaction reference.

## Consequences

Core workflows keep running when external systems are unavailable. Integration
failures retry from the outbox and can be reconciled later. Real Fabric Gateway,
ERP, finance API, e-signature, OIDC, and storage integrations can replace mocks
without changing the internal business workflow.
