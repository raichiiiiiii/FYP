# Current MEPN Prototype UI Workflow Walkthrough

## Purpose
This walkthrough documents the current UI states of the MEPN prototype after the
application shell, role-aware navigation, dev authentication flow, procurement
operations, evidence/audit review surfaces, finance workspaces, graph view,
integrations panel, and UAT preparation have been added.

The app is still not production-ready. Some external integrations remain mocked,
the deployment is still prototype/staging oriented, and OIDC/Fabric/ERP/e-sign
providers are not connected as real providers yet. The screenshots show what is
currently visible, what works now, and what should happen in the final version.

Screens were captured from the local E2E prototype on June 3, 2026 using seeded
demo data generated through API-backed test fixtures.

## Main User Journey
The primary walkthrough follows a seeded SME administrator and auditor through
the current prototype:

1. User opens the dev login/session page.
2. User reaches the dashboard and confirms system health.
3. User reviews organization setup and admin context.
4. User inspects procurement records and purchase order detail.
5. User reviews evidence pack detail and export status.
6. User searches audit events.
7. User opens a mudarabah finance application workspace.
8. User verifies closure pack state.
9. User inspects the project graph visualization.
10. User requests or reviews integration outbox actions.
11. Auditor confirms read-only integration behavior.
12. Unauthorized direct access shows access denied.

## Transition Summary
The current prototype now behaves more like an application shell than a simple
page-switching demo. Navigation is generated from route metadata, direct URL
access is guarded, sessions are loaded through the dev auth provider, and most
screens use centralized API helpers. Core workflows still use local prototype
data and mock adapters where appropriate.

## Screen 01 - Dev Login Session

![Screen 01 - Dev Login Session](assets/current-screen-01-login.png)

Status: Working for local/dev authentication

The user sees the dev login screen. It accepts either user and organization IDs
or an email-based development login, depending on the available seeded data.

Action that caused this state: The user opens `/login`.

What currently works:
- Session state is loaded through `AuthProvider`.
- Role codes, permission codes, organization ID, and user ID become frontend
  session claims.
- Protected routes depend on the session rather than direct feature-level
  `localStorage` reads.

Unfinished or mocked:
- Authentication is still a dev flow.
- Password login and production OIDC are not active yet.

Final intended behavior:
- OIDC or another verified provider should issue claims.
- The dev login page should remain available only for local testing.

## Screen 02 - Dashboard

![Screen 02 - Dashboard](assets/current-screen-02-dashboard.png)

Status: Working

The dashboard shows API, PostgreSQL, and Redis health. It also displays the
active organization context and system environment.

Action that caused this state: The user logs in or opens `/dashboard`.

What currently works:
- The frontend calls `GET /api/v1/health`.
- API, database, and Redis status are displayed.
- Organization context is visible when a session exists.
- Role-aware sidebar navigation is visible.

Unfinished or mocked:
- The dashboard is still operationally simple.
- It does not yet show deep alerts, deployment status, or worker backlog.

Final intended behavior:
- Keep dashboard health for operators.
- Add workflow metrics and integration backlog once UAT feedback confirms the
  most useful summary fields.

## Screen 03 - Organization Setup

![Screen 03 - Organization Setup](assets/current-screen-03-organization-setup.png)

Status: Working for prototype onboarding

The organization setup screen creates or confirms the SME organization, admin
user, admin role, membership, workspace, and initial audit event.

Action that caused this state: The user opens `/org/setup` as an SME admin.

What currently works:
- Organization creation persists to PostgreSQL.
- Admin user, role, membership, workspace, and audit event are created.
- Required fields show validation before submission.

Unfinished or mocked:
- The onboarding flow is still simple and local/dev oriented.
- Real identity verification and invited-user onboarding are deferred.

Final intended behavior:
- Setup should be tied to authenticated onboarding.
- Invitations, API clients, and workspace-scoped claims should become part of
  the production identity flow.

## Screen 04 - Procurement Requisitions

![Screen 04 - Procurement Requisitions](assets/current-screen-04-procurement-requisitions.png)

Status: Working operational prototype

The requisitions screen shows procurement records scoped to the active
organization. The current source-to-pay journey can reach approved, sourced,
purchase-order, receipt, invoice, and closed states.

Action that caused this state: The user opens `/procurement/requisitions` after
seeded procurement records have been created.

What currently works:
- Requisitions are created and listed.
- Submit, approve, and reject transitions are backed by API calls.
- Major procurement actions create audit events.
- Navigation includes projects, suppliers, approvals, approval rules, RFQs,
  quotations, purchase orders, receipt/invoice matching, receipts, and invoices.

Unfinished or mocked:
- Supplier-facing submission is still internal/mock.
- Approval rules exist at prototype level, not as a complete enterprise approval
  matrix.

Final intended behavior:
- Procurement should support richer approval routing, supplier collaboration,
  and reviewer-friendly timelines.

## Screen 05 - Purchase Order Detail

![Screen 05 - Purchase Order Detail](assets/current-screen-05-purchase-order-detail.png)

Status: Working detail page

The purchase order detail page shows the selected PO, linked supplier,
requisition/quotation context, items, receipt/invoice state, and action status.

Action that caused this state: The user opens
`/procurement/purchase-orders/:id`.

What currently works:
- Users can inspect individual records, not only list screens.
- The page links procurement state to related receipt and invoice information.
- Invalid workflow transitions are blocked by backend rules.

Unfinished or mocked:
- Downloadable PO document output is still minimal.
- Supplier delivery collaboration is not a separate portal yet.

Final intended behavior:
- PO detail should become the operational source for PO evidence, matching,
  supplier documents, and audit timeline links.

## Screen 06 - Evidence Pack Detail

![Screen 06 - Evidence Pack Detail](assets/current-screen-06-evidence-pack-detail.png)

Status: Working reviewer-grade prototype

The evidence pack detail page shows the evidence pack generated from procurement
records. It links the project, procurement evidence, export state, and evidence
items.

Action that caused this state: The user opens `/evidence/packs/:id` after
creating and exporting the pack.

What currently works:
- Evidence packs are generated from real procurement records.
- Export status updates.
- Evidence items and hashes are persisted.
- Evidence exports can be downloaded through the API.

Unfinished or mocked:
- The downloadable bundle is still prototype-grade.
- Fabric anchoring remains a mock adapter behind outbox.

Final intended behavior:
- Evidence packs should be reviewer-friendly dossiers containing procurement
  records, documents, hashes, audit timeline, and external anchor references.

## Screen 07 - Audit Search

![Screen 07 - Audit Search](assets/current-screen-07-audit-search.png)

Status: Working

The audit search page exposes audit filtering for reviewers. Users can search by
organization scope, event type, entity type, entity ID, actor, and date range.

Action that caused this state: The user opens `/audit/search`.

What currently works:
- Audit events are persisted for organization, procurement, evidence, finance,
  and integration actions.
- Filtering and pagination are available.
- Entity timelines are exposed through `/audit/entity/:entityType/:entityId`.

Unfinished or mocked:
- Audit anchoring is still local/mock.
- Reviewer export/report formatting can be improved.

Final intended behavior:
- Auditors should move from a filtered event to the source record, evidence
  item, hash verification result, and anchor status without losing context.

## Screen 08 - Finance Application Workspace

![Screen 08 - Finance Application Workspace](assets/current-screen-08-finance-workspace.png)

Status: Working multi-role prototype

The finance application workspace shows mudarabah application status,
opportunity context, evidence checklist, due diligence, Shariah review,
contract, disbursement, ledger, profit/loss, closure, and audit tabs.

Action that caused this state: The user opens `/finance/applications/:id`.

What currently works:
- Application creation starts from procurement opportunity/evidence.
- Evidence checklist generation works.
- Due diligence and Shariah review decisions are stored.
- Contract creation is blocked until the application is approved.
- Role-specific tabs and actions are visible or hidden by session claims.

Unfinished or mocked:
- Contract document generation uses a prototype document/e-signature flow.
- Real provider integration is not connected.

Final intended behavior:
- Financier, Shariah reviewer, procurement officer, and auditor views should be
  tuned through UAT feedback and backed by stricter backend permissions.

## Screen 09 - Closure Pack

![Screen 09 - Closure Pack](assets/current-screen-09-closure-pack.png)

Status: Working closure prototype

The closure pack screen shows finance closure state after contract execution,
disbursement, ledger entry, profit/loss statement, and closure export.

Action that caused this state: The user opens `/finance/closures`.

What currently works:
- Closure creation requires prior finance workflow state.
- Closure links back to the application, opportunity, and evidence pack.
- Closed state is visible to finance and auditor roles.

Unfinished or mocked:
- Closure export is not yet a polished final dossier.
- Supervisor sign-off and archival policy are not fully implemented.

Final intended behavior:
- Closure pack should become the final review artifact for procurement,
  mudarabah finance, evidence, audit, hash verification, and reviewer decisions.

## Screen 10 - Project Graph

![Screen 10 - Project Graph](assets/current-screen-10-project-graph.png)

Status: Working read-only visualization

The graph/canvas screen visualizes the seeded project/opportunity network. It
shows nodes and edges for organization, supplier, procurement, evidence, and
finance records where the active role is allowed to see them.

Action that caused this state: The user opens `/graph/projects`.

What currently works:
- Graph data comes from a backend read model.
- Nodes link back to source record screens.
- Finance nodes are hidden for roles without finance/audit visibility.

Unfinished or mocked:
- Graph is read-only.
- Canvas annotations, risk overlays, filters, and advanced layout are deferred.

Final intended behavior:
- Graph should remain a visualization layer over real records, not a second
  source of truth.

## Screen 11 - Integrations Outbox Control

![Screen 11 - Integrations Outbox Control](assets/current-screen-11-integrations.png)

Status: Working mock integration control surface

The integrations screen lets an organization admin request mock Fabric anchors,
mock e-signature packages, mock ERP sync, mock finance API notifications, and
webhook actions. The same screen lists outbox and reconciliation status.

Action that caused this state: The user opens `/integrations` as an organization
admin after a Fabric anchor request has been queued.

What currently works:
- Integration requests create `OutboxEvent` records.
- Duplicate integration actions use idempotency keys.
- Request actions create audit events.
- Status displays `PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`, or
  `RETRYING`.
- Reconciliation records are exposed after worker processing.

Unfinished or mocked:
- Fabric, ERP, finance API, e-signature, and webhook providers are mock adapters.
- Real MinIO storage exists, but external-provider integrations remain deferred.

Final intended behavior:
- Core workflows should keep working even when integrations fail.
- Real adapters should replace mocks only after evidence/audit behavior is stable.

## Screen 12 - Auditor Read-Only Integrations

![Screen 12 - Auditor Read-Only Integrations](assets/current-screen-12-auditor-read-only-integrations.png)

Status: Working role-scoped read-only state

The auditor sees the integrations page as a read-only review surface. Request
forms are hidden, while status and reconciliation information remain visible.

Action that caused this state: The user opens `/integrations` with an auditor
session.

What currently works:
- Role-aware navigation allows auditors to inspect integrations.
- Admin-only request actions are hidden from auditor sessions.
- Direct route access still passes through the same route guard.

Unfinished or mocked:
- Backend permission checks should be expanded as real providers are added.

Final intended behavior:
- Auditors should be able to review external effect history without being able
  to trigger external effects.

## Screen 13 - Access Denied

![Screen 13 - Access Denied](assets/current-screen-13-access-denied.png)

Status: Working route guard

The access denied state appears when a role opens a route that requires
permissions it does not have.

Action that caused this state: An auditor directly opens a procurement write
route such as `/procurement/projects`.

What currently works:
- Route metadata drives frontend access decisions.
- Users see only relevant sidebar navigation.
- Direct URL access without permission shows `Access denied`.

Unfinished or mocked:
- Backend permission checks exist for key workflows but should be expanded to
  every mutation before production.

Final intended behavior:
- Frontend route guards should improve usability, while backend permission
  checks remain the source of truth.

## Developer And Reviewer Notes
- The app now uses a React Router application shell under `apps/web/src/app`.
- Sidebar navigation comes from route metadata in `navigation.ts`.
- Session state is loaded through `AuthProvider` and dev auth endpoints.
- Feature screens use shared API helpers and TanStack Query cache invalidation.
- Core procurement, evidence, finance, graph, and integration calls are real
  REST calls against the NestJS API.
- PostgreSQL, Redis, and MinIO run through Docker Compose.
- Fabric, ERP, e-signature, finance API, and webhook providers remain mock
  adapters behind outbox.
- Screenshots use seeded development/E2E data, not production data.
- Formal UAT documentation now exists under `docs/test`.

## Current Status
The current MEPN prototype has moved beyond a basic skeletal shell. It now has:

- Dev login/session flow.
- Role-aware sidebar navigation and route guards.
- Shared frontend structure, components, validation, loading, empty, error, and
  toast patterns.
- Typed API/data-layer helpers.
- Procurement list and detail workflows.
- Evidence pack detail/export/hash surfaces.
- Audit filtering and entity timeline routes.
- Role-scoped mudarabah finance workspaces.
- Closure pack state.
- Read-only graph/canvas visualization.
- Integration outbox control and reviewer views.
- UAT readiness documents and repeatable seed command.

## Remaining Work
1. Replace dev auth with real OIDC when the provider is ready.
2. Expand backend permission checks across all mutations.
3. Polish evidence and closure exports into final reviewer dossiers.
4. Replace mock integration adapters with real providers only after local
   evidence/audit behavior is stable.
5. Add reverse proxy/HTTPS and harden the Azure deployment.
6. Run formal UAT with SME admin, procurement officer, approver, finance user,
   financier reviewer, Shariah reviewer, and auditor groups.
7. Use UAT findings to refine screen wording, workflow gates, and reviewer
   evidence presentation.
