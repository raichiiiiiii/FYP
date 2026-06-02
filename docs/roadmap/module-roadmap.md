# Module Roadmap and Feature Intake

## Status
Accepted by [ADR-013](../adr/ADR-013-module-roadmap-feature-intake.md).

## Purpose
This document prevents MEPN from becoming a mixed-function application again.
Every new feature must enter through one module roadmap, with SRS/SDD mapping,
screen/API/database ownership, audit expectations, permissions, tests, and
documentation updates identified before implementation starts.

## Required Intake Rule
Do not add a new feature directly to a page, service, controller, or database
schema without first assigning it to one of these roadmaps:

1. Identity and Access
2. Procurement
3. Evidence and Audit
4. Mudarabah Finance
5. Graph/Canvas
6. Integrations
7. Reporting
8. Administration
9. Operations

If a feature appears to span multiple modules, choose one owning module and list
the supporting modules as dependencies.

## Feature Intake Template
Copy this block into the issue, planning note, PR description, or implementation
document for every new feature.

```md
## Feature Intake

Feature name:

Owning module:

Supporting modules:

User role:

Problem solved:

SRS/SDD mapping:

Screen affected:

API endpoint affected:

Database entity affected:

Audit event required:

Permission required:

Outbox/integration side effect:

Test required:

Documentation update required:

Implementation notes:
```

## Module Roadmaps

### 1. Identity and Access
Scope:
Organization ownership, users, roles, permissions, memberships, invitations,
workspace scopes, local/dev sessions, future OAuth/OIDC, and API clients.

Typical screens:
- `/org/setup`
- `/admin/users`
- `/admin/roles`
- `/login`

Typical API areas:
- `/api/v1/auth/*`
- `/api/v1/orgs/*`
- `/api/v1/users`
- `/api/v1/roles`
- `/api/v1/memberships`

Typical database entities:
Organization, User, Role, Permission, Membership, Workspace, Invitation.

Audit expectations:
Organization creation, user creation, role creation, membership assignment,
invitation changes, session-sensitive administrative changes.

Test expectations:
RBAC unit tests, auth/session integration tests, role-aware navigation E2E tests.

### 2. Procurement
Scope:
Projects, suppliers, requisitions, approvals, RFQs, quotations, purchase orders,
receipts, invoices, supplier-facing quotation flows, approval matrices, matching,
and procurement timelines.

Typical screens:
- `/procurement/projects`
- `/procurement/suppliers`
- `/procurement/requisitions`
- `/procurement/approvals`
- `/procurement/rfqs`
- `/procurement/quotations`
- `/procurement/purchase-orders`
- `/procurement/matching`

Typical API areas:
- `/api/v1/projects`
- `/api/v1/suppliers`
- `/api/v1/requisitions`
- `/api/v1/rfqs`
- `/api/v1/quotations`
- `/api/v1/purchase-orders`
- `/api/v1/receipts`
- `/api/v1/invoices`
- `/api/v1/procurement/*`

Typical database entities:
Project, Supplier, Requisition, RequisitionItem, ApprovalRequest, ApprovalRule,
RFQ, RFQItem, Quotation, QuotationItem, PurchaseOrder, PurchaseOrderItem,
Receipt, Invoice.

Audit expectations:
Every major procurement record creation and state transition.

Test expectations:
State machine unit tests, API/database integration tests, source-to-pay E2E tests.

### 3. Evidence and Audit
Scope:
Documents, immutable versions, evidence items, evidence packs, local hashing,
audit events, entity timelines, hash verification, local exports, and future
anchor visibility.

Typical screens:
- `/evidence/documents`
- `/evidence/packs`
- `/evidence/hashes`
- `/audit`
- `/audit/search`
- `/audit/entity/:entityType/:entityId`

Typical API areas:
- `/api/v1/documents`
- `/api/v1/evidence-items`
- `/api/v1/evidence-packs`
- `/api/v1/hash-records`
- `/api/v1/audit-events`

Typical database entities:
Document, DocumentVersion, EvidenceItem, EvidencePack, HashRecord, AuditEvent,
AuditAnchor, OutboxEvent.

Audit expectations:
Document registration, version creation, evidence pack export, hash creation,
hash verification, and anchor requests.

Test expectations:
Canonical hash unit tests, document/evidence integration tests, evidence/audit
E2E tests.

### 4. Mudarabah Finance
Scope:
Procurement opportunities, capital applications, evidence checklists, due
diligence, Shariah review, restricted contracts, mock e-signature packages,
disbursements, ledgers, profit/loss, closure packs, and reviewer workspaces.

Typical screens:
- `/finance/opportunities`
- `/finance/applications`
- `/finance/applications/:id/:workspaceTab`
- `/finance/contracts`
- `/finance/ledgers`
- `/finance/profit-loss`
- `/finance/closures`

Typical API areas:
- `/api/v1/opportunities`
- `/api/v1/applications`
- `/api/v1/contracts`
- `/api/v1/disbursements`
- `/api/v1/project-ledgers/entries`
- `/api/v1/profit-loss/statements`
- `/api/v1/closures`

Typical database entities:
ProcurementOpportunity, MudarabahApplication, EvidenceChecklist,
EvidenceChecklistItem, DueDiligenceReport, ShariahReview, MudarabahContract,
Disbursement, ProjectLedgerEntry, ProfitLossStatement, ProfitDistribution,
LossException, ClosurePack.

Audit expectations:
Application submission, evidence checklist generation, review decisions,
approval/rejection, contract generation, e-sign request, disbursement, ledger
entry, profit/loss statement, and closure export.

Test expectations:
Policy unit tests, API integration tests for gates and side effects, multi-role
finance E2E tests.

### 5. Graph/Canvas
Scope:
Visual procurement/finance/audit graph views, workspace-scoped canvases, node
and edge visibility, reviewer annotations, and entity-to-entity navigation.

Typical screens:
- `/graph/workspaces`
- `/graph/canvas/:workspaceId`

Typical API areas:
- `/api/v1/graph/workspaces`
- `/api/v1/graph/nodes`
- `/api/v1/graph/edges`

Typical database entities:
GraphWorkspace, GraphNode, GraphEdge, GraphAnnotation, Workspace.

Audit expectations:
Canvas creation, annotation changes, shared reviewer views, and graph export.

Test expectations:
Permission unit tests, graph API integration tests, E2E navigation and visibility
tests.

### 6. Integrations
Scope:
ERP, Fabric anchoring, finance API notifications, e-signature, webhooks, MinIO/S3,
OIDC, outbox processing, retries, idempotency, and reconciliation records.

Typical screens:
- `/integrations`
- `/integrations/outbox`
- `/integrations/reconciliation`

Typical API areas:
- `/api/v1/integrations/*`
- Worker outbox processing

Typical database entities:
OutboxEvent, AuditAnchor, IntegrationReconciliationRecord, WebhookSubscription,
WebhookDelivery.

Audit expectations:
Integration request creation, retry state changes, reconciliation updates, anchor
completion, and failed delivery handling.

Test expectations:
Adapter unit tests, worker/outbox integration tests, retry/idempotency tests.

### 7. Reporting
Scope:
Management dashboards, procurement reports, evidence reports, finance reports,
audit summaries, reviewer exports, and future regulatory-ready report packs.

Typical screens:
- `/reports`
- `/reports/procurement`
- `/reports/finance`
- `/reports/audit`

Typical API areas:
- `/api/v1/reports/*`
- Evidence pack export APIs when report output becomes evidence.

Typical database entities:
ReportDefinition, ReportRun, ReportExport, EvidencePack.

Audit expectations:
Report export, report evidence registration, and reviewer-visible report packs.

Test expectations:
Report calculation unit tests, export integration tests, reporting E2E tests.

### 8. Administration
Scope:
System settings, feature flags, organization configuration, environment display,
deployment mode settings, data retention settings, and administrative tools.

Typical screens:
- `/admin/settings`
- `/admin/feature-flags`
- `/admin/organization`

Typical API areas:
- `/api/v1/admin/*`
- `/api/v1/orgs/:id`

Typical database entities:
Organization, Workspace, FeatureFlag, SystemSetting, AuditEvent.

Audit expectations:
Any setting change that affects access, workflow behavior, integrations, or data
retention.

Test expectations:
Admin policy unit tests, settings integration tests, admin E2E tests.

### 9. Operations
Scope:
Health, job monitoring, queue status, backups, deployment checks, observability,
incident review, and operational readiness.

Typical screens:
- `/operations/health`
- `/operations/jobs`
- `/operations/outbox`

Typical API areas:
- `/api/v1/health`
- `/api/v1/operations/*`
- Worker status endpoints when added.

Typical database entities:
OutboxEvent, IntegrationReconciliationRecord, AuditEvent, OperationalCheck.

Audit expectations:
Operational actions that affect retries, job state, exports, anchors, or system
configuration.

Test expectations:
Health integration tests, worker integration tests, smoke E2E tests, performance
and security checks where applicable.

## Intake Workflow
1. Choose the owning module from the roadmap.
2. Fill in the feature intake template.
3. Confirm SRS/SDD mapping before implementation.
4. Identify screens, endpoints, entities, permissions, audit events, and tests.
5. Implement within the module boundary.
6. Add or update unit, integration, and E2E tests based on user impact.
7. Update documentation and traceability notes.

## Acceptance Gate
A feature is not ready to merge unless the PR can answer:

- Which module owns this feature?
- Which SRS/SDD requirement or design concern does it map to?
- Which role can use it?
- Which route, endpoint, and database entity changed?
- Which audit event is created or why none is needed?
- Which permission gates the behavior?
- Which outbox or integration side effect exists or why none is needed?
- Which tests prove it?
- Which docs changed?

## Example Intake
```md
## Feature Intake

Feature name:
Supplier portal quotation submission

Owning module:
Procurement

Supporting modules:
Identity and Access, Evidence and Audit

User role:
Supplier user

Problem solved:
Allows a supplier to submit quotations against published RFQs without internal
procurement staff retyping supplier responses.

SRS/SDD mapping:
Procurement workflow, supplier participation, auditability, organization/workspace
scope.

Screen affected:
- /supplier/rfqs
- /supplier/quotations/new

API endpoint affected:
- POST /api/v1/supplier/quotations
- GET /api/v1/supplier/rfqs

Database entity affected:
Supplier, RFQ, Quotation, QuotationItem, AuditEvent

Audit event required:
QUOTATION_SUBMITTED_BY_SUPPLIER

Permission required:
supplier:quotation:create

Outbox/integration side effect:
Optional webhook notification to procurement team.

Test required:
- Unit permission test
- Integration quotation submission test
- E2E supplier quotation flow

Documentation update required:
Procurement roadmap and test traceability.
```
