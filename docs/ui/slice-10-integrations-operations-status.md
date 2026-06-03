# Slice 10: Integrations and Operations Status

## Status

Implemented foundation.

## Scope

This slice adds operational visibility for the current prototype without claiming
production readiness.

Implemented:

- `/integrations` shows ERP, Fabric, webhook, e-signature, finance API, and outbox
  status cards.
- `/operations` and `/operations/health` show API, PostgreSQL, Redis, outbox worker,
  object storage, backup/restore, and deployment-readiness status.
- Failed or retrying outbox events produce degraded integration states.
- External adapters are marked `not_configured` or `pending` unless health or
  reconciliation data supports a stronger status.
- Backup/restore and object storage are not marked healthy because dedicated
  health endpoints do not exist yet.

Deferred:

- Admin feature flags, API clients, and data residency screens.
- Reports and export analytics.
- Real ERP/Fabric/e-signature/provider health probes.
- Backup freshness, restore-test, migration, TLS, and release metadata endpoints.

## Product Rule

The UI must not claim external integrations, Fabric anchoring, object storage,
backup/restore, or deployment readiness are healthy unless the state is backed by
loaded backend health data, reconciliation records, or an explicit test fixture.
