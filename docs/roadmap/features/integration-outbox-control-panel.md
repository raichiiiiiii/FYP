# Feature Intake: Integration Outbox Control Panel

## Module
Integrations

## User Role
Organization admin requests integration actions. Auditors, procurement officers,
and finance reviewers inspect integration status.

## Problem Solved
External effects such as Fabric anchoring, ERP sync, e-signature packages,
finance API notifications, and webhook deliveries need to remain controlled,
retryable, and visible without becoming core business workflow dependencies.

## SRS/SDD Mapping
- SRS-INT-001: Integration requests use outbox events and adapters.
- SDD Integration Boundary: external systems are unreliable by default and must
  use adapters, idempotency, retries, reconciliation records, and audit events.

## Screens Affected
- `/integrations`

## API Endpoints Affected
- `POST /api/v1/integrations/fabric/anchors`
- `POST /api/v1/integrations/esign/packages`
- `POST /api/v1/integrations/erp/sync`
- `POST /api/v1/integrations/webhooks/subscriptions`
- `POST /api/v1/integrations/webhooks/deliveries`
- `GET /api/v1/integrations/outbox`
- `GET /api/v1/integrations/outbox/:id`
- `GET /api/v1/integrations/reconciliation`

## Database Entities Affected
- `OutboxEvent`
- `IntegrationReconciliationRecord`
- `WebhookSubscription`
- `WebhookDelivery`
- `AuditEvent`

## Audit Event Required
Yes. Each external effect request records an audit event with the outbox event ID
as the correlation ID. Webhook subscription creation records
`WEBHOOK_SUBSCRIPTION_CREATED`.

## Permission Required
Admin users can request integration actions. Auditor/reviewer roles can inspect
status and reconciliation records through role-aware navigation.

## Outbox/Integration Side Effect
Yes. External effects are requested only by creating outbox events. The worker
processes events through mock adapters and writes reconciliation records.

## Test Required
- API integration test for audit event creation, idempotency, retry display, and
  reconciliation visibility.
- Playwright E2E test for admin request flow and auditor read-only view.

## Documentation Update Required
Yes. README and test traceability should mention the integration outbox control
surface.
