# FYP

## Official Implementation Stack

The MEPN MVP stack is now accepted through [ADR-011](docs/adr/ADR-011-implementation-stack.md).

- Frontend: React + TypeScript + Vite
- Backend/API: NestJS + TypeScript
- Worker: separate NestJS/Node worker application
- Database: PostgreSQL
- ORM/migrations: Prisma
- Queue/cache/locks: Redis
- Object storage: MinIO locally, S3-compatible later
- Auth: local/dev auth first, then OAuth/OIDC integration
- Deployment: Docker Compose
- API style: REST + OpenAPI
- Package manager: pnpm workspace

Official project references:

- [Technology stack](docs/technology-stack.md)
- [ADR-011: Implementation Stack for MEPN MVP](docs/adr/ADR-011-implementation-stack.md)
- [Module roadmap and feature intake](docs/roadmap/module-roadmap.md)
- [ADR-013: Module Roadmap Feature Intake](docs/adr/ADR-013-module-roadmap-feature-intake.md)

## Repository Structure

```text
apps/
  web/      React + TypeScript + Vite frontend
  api/      NestJS REST API and BFF
  worker/   Background jobs for outbox, audit anchoring, and integrations
packages/
  shared/   Shared DTOs, constants, enums, and validation schemas
  config/   Shared environment/config utilities
infra/
  docker-compose.yml
  postgres/
  redis/
  minio/
docs/
  design/
  adr/
```

## Getting Started

Prerequisites:

- Node.js LTS
- Corepack
- Docker Desktop or Docker Engine

Install dependencies:

```bash
corepack enable
pnpm install
```

If `pnpm` is not available as a shell command, use Corepack directly and replace `pnpm` with `corepack pnpm` in the commands below:

```bash
corepack pnpm install
```

Start local infrastructure:

```bash
docker compose -f infra/docker-compose.yml up -d
```

Run each app:

```bash
pnpm dev:web
pnpm dev:api
pnpm dev:worker
```

Or run all app dev servers together:

```bash
pnpm dev
```

Default ports:

- Web: http://localhost:5173
- API: http://localhost:3000
- PostgreSQL: localhost:5432
- Redis: localhost:6379
- MinIO API: http://localhost:9000
- MinIO console: http://localhost:9001

## Deployment

The student-budget prototype deployment runbook is documented here:

- [Azure Student VM Deployment Guide](docs/deployment/azure-student-vm-deployment.md)

The guide covers Azure VM setup, environment configuration, Docker Compose
infrastructure, tmux process startup, verification, UAT/demo seeding, backups,
cost controls, and handover.

## Walking Skeleton

The first vertical slice proves the browser, React frontend, NestJS API, PostgreSQL, and Redis can run end to end.

Start infrastructure:

```bash
docker compose -f infra/docker-compose.yml up -d
```

Start the API and web app in separate terminals:

```bash
pnpm dev:api
pnpm dev:web
```

Open the dashboard:

```text
http://localhost:5173/dashboard
```

The dashboard calls:

```text
GET http://localhost:3000/api/v1/health
```

Expected healthy response:

```json
{
  "status": "ok",
  "service": "mepn-api",
  "database": "ok",
  "redis": "ok",
  "environment": "development",
  "timestamp": "2026-06-02T00:00:00.000Z"
}
```

## Identity And Organization

Step 4 adds local/dev identity and organization ownership for future procurement, finance, audit, graph, and Fabric work.

Frontend screens:

- `http://localhost:5173/org/setup`
- `http://localhost:5173/admin/users`
- `http://localhost:5173/admin/roles`
- `http://localhost:5173/audit`

API endpoints:

- `POST /api/v1/orgs`
- `GET /api/v1/orgs/:id`
- `PATCH /api/v1/orgs/:id`
- `POST /api/v1/users`
- `GET /api/v1/users`
- `GET /api/v1/users/:id`
- `POST /api/v1/roles`
- `GET /api/v1/roles`
- `POST /api/v1/memberships`
- `GET /api/v1/orgs/:orgId/memberships`
- `GET /api/v1/audit-events`

The `/org/setup` journey creates an organization, admin user, admin role, membership, default workspace, and `ORGANIZATION_CREATED` audit event, then redirects to `/dashboard`.

## Procurement Core

Step 5 adds one controlled source-to-pay path from requisition through invoice. Records are scoped to an organization and major transitions create audit events.

Frontend screens:

- `http://localhost:5173/procurement/projects`
- `http://localhost:5173/procurement/suppliers`
- `http://localhost:5173/procurement/requisitions`
- `http://localhost:5173/procurement/requisitions/new`
- `http://localhost:5173/procurement/rfqs`
- `http://localhost:5173/procurement/quotations`
- `http://localhost:5173/procurement/purchase-orders`
- `http://localhost:5173/procurement/receipts`
- `http://localhost:5173/procurement/invoices`

Development sessions read `organizationId` and `actorUserId` from local storage. They can also be provided as URL query parameters for local QA.

API endpoints:

- `POST /api/v1/projects`
- `GET /api/v1/projects?organizationId=:organizationId`
- `POST /api/v1/suppliers`
- `GET /api/v1/suppliers?organizationId=:organizationId`
- `POST /api/v1/requisitions`
- `GET /api/v1/requisitions?organizationId=:organizationId`
- `GET /api/v1/requisitions/:id`
- `POST /api/v1/requisitions/:id/submit`
- `POST /api/v1/requisitions/:id/approve`
- `POST /api/v1/requisitions/:id/reject`
- `POST /api/v1/rfqs`
- `GET /api/v1/rfqs?organizationId=:organizationId`
- `POST /api/v1/rfqs/:id/publish`
- `POST /api/v1/quotations`
- `GET /api/v1/quotations?organizationId=:organizationId`
- `POST /api/v1/purchase-orders`
- `GET /api/v1/purchase-orders?organizationId=:organizationId`
- `POST /api/v1/purchase-orders/:id/issue`
- `POST /api/v1/receipts`
- `POST /api/v1/invoices`

Persisted lifecycle:

```text
DRAFT -> SUBMITTED -> APPROVED -> SOURCING -> AWARDED -> PO_ISSUED -> RECEIVED -> INVOICED -> CLOSED
```

Required procurement audit events:

```text
SUPPLIER_CREATED
PROJECT_CREATED
REQUISITION_CREATED
REQUISITION_SUBMITTED
REQUISITION_APPROVED
RFQ_CREATED
QUOTATION_RECEIVED
PURCHASE_ORDER_CREATED
PURCHASE_ORDER_ISSUED
RECEIPT_RECORDED
INVOICE_RECORDED
```

## Evidence And Local Audit

Step 6 turns procurement records into local trusted evidence without adding a Fabric dependency.

Evidence frontend screens:

- `http://localhost:5173/evidence/documents`
- `http://localhost:5173/evidence/items`
- `http://localhost:5173/evidence/packs`
- `http://localhost:5173/evidence/hashes`
- `http://localhost:5173/evidence/timeline`

API endpoints:

- `POST /api/v1/documents`
- `GET /api/v1/documents/:id`
- `POST /api/v1/documents/:id/versions`
- `POST /api/v1/evidence-items`
- `GET /api/v1/evidence-items?organizationId=:organizationId`
- `POST /api/v1/evidence-packs`
- `GET /api/v1/evidence-packs?organizationId=:organizationId`
- `GET /api/v1/evidence-packs/:id`
- `POST /api/v1/evidence-packs/:id/export`
- `GET /api/v1/audit-events/entity/:entityType/:entityId`
- `POST /api/v1/hash-records`
- `GET /api/v1/hash-records/:id/verify`

Evidence entities:

```text
Document
DocumentVersion
EvidenceItem
EvidencePack
HashRecord
AuditAnchor
OutboxEvent
```

Hashing rule:

- Hash canonical JSON only.
- Sort object keys before hashing.
- Store canonical text and SHA-256 hash locally.
- Keep document versions append-only by creating new `DocumentVersion` rows instead of updating old versions.
- Do not hash random UI output.
- Do not require Fabric for local verification.

## Mudarabah Finance

Step 7 adds a Mudarabah finance workflow that starts from procurement opportunity and evidence records.

Finance frontend screens:

- `http://localhost:5173/finance/opportunities`
- `http://localhost:5173/finance/opportunities/new`
- `http://localhost:5173/finance/applications`
- `http://localhost:5173/finance/applications/:id`
- `http://localhost:5173/finance/applications/:id/evidence`
- `http://localhost:5173/finance/applications/:id/due-diligence`
- `http://localhost:5173/finance/applications/:id/shariah-review`
- `http://localhost:5173/finance/contracts`
- `http://localhost:5173/finance/ledgers`
- `http://localhost:5173/finance/profit-loss`
- `http://localhost:5173/finance/closures`

API endpoints:

- `POST /api/v1/opportunities`
- `GET /api/v1/opportunities?organizationId=:organizationId`
- `GET /api/v1/opportunities/:id`
- `POST /api/v1/applications`
- `GET /api/v1/applications?organizationId=:organizationId`
- `GET /api/v1/applications/:id`
- `POST /api/v1/applications/:id/submit`
- `POST /api/v1/applications/:id/evidence-checklist`
- `POST /api/v1/evidence-checklists/:id/complete-item`
- `POST /api/v1/applications/:id/due-diligence`
- `POST /api/v1/applications/:id/shariah-review`
- `POST /api/v1/applications/:id/approve`
- `POST /api/v1/applications/:id/reject`
- `POST /api/v1/contracts`
- `GET /api/v1/contracts?organizationId=:organizationId`
- `POST /api/v1/contracts/:id/generate-document`
- `POST /api/v1/contracts/:id/mark-signed`
- `POST /api/v1/disbursements`
- `POST /api/v1/project-ledgers/entries`
- `GET /api/v1/project-ledgers/entries?organizationId=:organizationId`
- `POST /api/v1/profit-loss/statements`
- `GET /api/v1/profit-loss/statements?organizationId=:organizationId`
- `POST /api/v1/closures`
- `GET /api/v1/closures?organizationId=:organizationId`

Persisted finance lifecycle:

```text
DRAFT -> SUBMITTED -> EVIDENCE_PENDING -> DUE_DILIGENCE_IN_REVIEW -> SHARIAH_IN_REVIEW -> APPROVED -> CONTRACT_PENDING_SIGNATURE -> CONTRACT_EXECUTED -> DISBURSED -> MONITORING -> PROFIT_LOSS_CALCULATED -> CLOSED
```

Contract rule:

- Application approval requires approved due diligence and approved Shariah review.
- Contract creation requires an approved application.
- Disbursement requires an executed contract.
- Closure requires a calculated profit/loss statement.

## Graph And Canvas

Step 10 adds a read-only project/opportunity graph as a visualization layer. The
canvas does not create or update transaction records; it renders a backend read
model from existing procurement, evidence, audit, and finance records.

Frontend screen:

- `http://localhost:5173/graph/projects`

API endpoint:

- `GET /api/v1/graph/projects/:projectId?organizationId=:organizationId&actorUserId=:actorUserId`

Initial graph nodes:

```text
Organization
Buyer/customer
Supplier
Procurement project
Requisition
RFQ
Quotation
Purchase order
Invoice
Evidence pack
Finance opportunity
Mudarabah application
Contract
Closure pack
```

Graph rules:

- Graph data comes from a backend read model.
- Nodes link back to the source record screens.
- Finance nodes are hidden for roles without finance/audit visibility.
- Core transaction processing does not depend on the graph.

## Integrations And Mock Fabric

Step 8 adds the integration boundary without making the core app depend on real external systems.

Official reference:

- [ADR-012: Integration Boundary and Mock Fabric Anchoring](docs/adr/ADR-012-integration-boundary.md)

Integration modules:

```text
apps/api/src/modules/integrations/
  erp/
  fabric/
  finance-api/
  esign/
  webhooks/
```

Frontend screen:

- `http://localhost:5173/integrations`

Integration request endpoints:

- `POST /api/v1/integrations/erp/sync`
- `POST /api/v1/integrations/fabric/anchors`
- `POST /api/v1/integrations/finance-api/notifications`
- `POST /api/v1/integrations/esign/packages`
- `POST /api/v1/integrations/webhooks/subscriptions`
- `GET /api/v1/integrations/webhooks/subscriptions?organizationId=:organizationId`
- `POST /api/v1/integrations/webhooks/deliveries`

Integration status endpoints:

- `GET /api/v1/integrations/outbox?organizationId=:organizationId`
- `GET /api/v1/integrations/outbox/:id`
- `GET /api/v1/integrations/reconciliation?organizationId=:organizationId`

Outbox event types:

```text
ERP_SYNC_REQUESTED
FABRIC_ANCHOR_REQUESTED
ESIGNATURE_PACKAGE_REQUESTED
FINANCE_API_NOTIFICATION_REQUESTED
WEBHOOK_DELIVERY_REQUESTED
EVIDENCE_PACK_EXPORT_REQUESTED
```

Outbox behavior:

- Integration requests are persisted to `OutboxEvent`.
- `idempotencyKey` prevents duplicate requested integrations.
- Request actions create audit events with the outbox event ID as the correlation ID.
- The UI displays `PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`, and `RETRYING` states.
- The worker claims pending events, calls the mock adapter, stores an external reference in `IntegrationReconciliationRecord`, then marks the event completed.
- Failed events are rescheduled with retry state and move to `FAILED` after `WORKER_MAX_ATTEMPTS`.
- Hash record creation enqueues `FABRIC_ANCHOR_REQUESTED`.
- Mock Fabric anchoring writes an `AuditAnchor` with `ANCHORED_MOCK` status.

Worker configuration:

```env
WORKER_POLL_ENABLED=true
WORKER_POLL_INTERVAL_MS=5000
WORKER_MAX_ATTEMPTS=5
```

Real integrations remain deferred until the internal procurement, evidence, audit, and finance paths are stable.

## UAT Preparation

Phase 12 prepares formal UAT with role-based scenarios, evidence capture, defect
tracking, supervisor notes, and repeatable demo data.

UAT documents:

- [UAT readiness plan](docs/test/uat-readiness.md)
- [UAT scenario checklist](docs/test/uat-scenario-checklist.md)
- [UAT defect log](docs/test/uat-defect-log.md)
- [UAT feedback and supervisor notes](docs/test/uat-feedback-and-supervisor-notes.md)

Create repeatable UAT demo data after the API is running:

```bash
pnpm seed:uat
```

Use `UAT_API_BASE_URL` to target a deployed prototype/staging API.
