# UI/UX Implementation Reading List And Repository Progress

## Purpose

This document lists the files that should be read before planning or
implementing further MEPN UI/UX work. It explains the purpose of each document
or source area and summarizes the current repository implementation progress.

Use this as the starting point for any future UI/UX implementation slice.

## Source-Of-Truth Reading Order

Read these first, in this order. This order prevents the UI from drifting into
prototype-only behavior.

| Order | File or folder | Purpose for UI/UX work |
|---:|---|---|
| 1 | `AGENTS.md` | Defines project rules for agents, source-of-truth order, Figma limitations, required tests, and safety constraints. Read before any code or design work. |
| 2 | `docs/requirements/mudarabah_eprocurement_srs.tex` | Product requirements authority. Defines actors, business rules, use cases, audit/security expectations, procurement, evidence, finance, integration, and deployment requirements. |
| 3 | `docs/design/mepn_software_design_description.tex` | Software design authority. Explains architecture, modules, containers, data boundaries, audit/outbox design, and integration assumptions. |
| 4 | `docs/ui/mepn-ui-contract-flow.md` | Behavioral UI contract. Defines intended user flows, screen responsibilities, workflow gates, and UI behavior that production screens should follow. |
| 5 | `docs/ui/mepn-ui-contract-flow-appendix.md` | Additional UI contract details. Use for edge cases, supporting flows, and extended screen behavior. |
| 6 | `docs/ui/figma-to-ui-contract-map.md` | Maps Figma Make screens/components to production areas and UI contract responsibilities. Use this before adapting any Figma pattern. |
| 7 | `docs/design/figma-make-reference/README.md` | Explains that the Figma Make bundle is visual/interaction reference only and must not be treated as business logic. |
| 8 | `docs/design/figma-make-reference/prototype-src/` | Exported Figma Make React prototype. Use for visual hierarchy, layout density, and interaction reference only. Do not import it into production code. |
| 9 | Existing production code under `apps/web/src/` and `apps/api/src/` | Implementation reality. Inspect this after reading the docs so changes preserve current architecture and backend contracts. |

## UI/UX Planning Documents

These documents are the main working references for future UI/UX planning.

| File | Function / purpose |
|---|---|
| `docs/ui/current-vs-figma-web-ui-workflow.md` | Current-vs-Figma assessment with current production screenshots, Figma Make screenshots, screen inventory, role flows, interaction notes, risks, and implementation-safe TODOs. This is the most useful document for visual/UI tailoring. |
| `docs/ui/skeletal-web-ui-workflow.md` | Current production UI walkthrough. Documents visible screens, current working states, mocked/deferred behavior, and intended final behavior. Use to understand what reviewers can see today. |
| `docs/ui/figma-to-ui-contract-map.md` | Maps each Figma reference component to a production area and UI contract responsibility. Use before implementing any Figma-inspired screen. |
| `docs/use-cases-and-mock-data.md` | Realistic TechBuild/SolarTech/Amanah demo scenario and mock data blueprint. Use for seeded demo states, screenshots, UAT flows, and non-empty UI design. |
| `docs/implementation-plan.md` | Slice-based implementation roadmap. Defines the expected implementation loop and slices for shell, dashboard, applications, workspace, opportunities, procurement, ledger, audit, graph, integrations, operations, admin, and reports. |
| `docs/phase-0-to-23-todo.md` | Practical tracker for unfinished work and blockers across phases 0-23. Use this to avoid repeating already-known gaps. |
| `docs/product-codebase-overview.md` | Product vision and codebase overview. Use to explain how product goals connect to code modules. |
| `docs/demo-script.md` | Reviewer/demo path. Use this to decide which screens must be polished and stable for academic/product review. |

## Figma Make Reference Files To Inspect

The Figma Make prototype must remain isolated from production source. Use these
files only as reference.

| File | Function / purpose |
|---|---|
| `docs/design/figma-make-reference/FIGMA_SOURCE.md` | Records the source and storage rule for the Figma Make export. |
| `docs/design/figma-make-reference/prototype-src/src/app/App.tsx` | Shows the prototype's local auth state, role switching, view switching, and high-level screen routing. Use to understand intended prototype flow, not production routing. |
| `docs/design/figma-make-reference/prototype-src/src/app/components/Sidebar.tsx` | Dark sidebar layout, module grouping, role selector, anchor status widget, and navigation labels. Adapt layout patterns safely; do not copy role switching. |
| `docs/design/figma-make-reference/prototype-src/src/app/components/LandingView.tsx` | Public landing, sign-in role modal, registration, and invite entry visual direction. |
| `docs/design/figma-make-reference/prototype-src/src/app/components/OrgSetupView.tsx` | Multi-step organization onboarding wizard reference. |
| `docs/design/figma-make-reference/prototype-src/src/app/components/PlatformDashboardView.tsx` | SME Admin/platform manager dashboard reference. |
| `docs/design/figma-make-reference/prototype-src/src/app/components/DashboardView.tsx` | Role-aware dashboard, KPI, task inbox, and activity reference. |
| `docs/design/figma-make-reference/prototype-src/src/app/components/ProcurementView.tsx` | Procurement Hub reference: KPI cards, tabs, exceptions, supplier scoring, and analytics direction. |
| `docs/design/figma-make-reference/prototype-src/src/app/components/ApplicationsList.tsx` | Mudarabah application pipeline list reference. |
| `docs/design/figma-make-reference/prototype-src/src/app/components/ApplicationWorkspace.tsx` | Main finance workspace reference: lifecycle stepper, evidence checklist, review panels, contract/disbursement, ledger, audit. High value, high risk. |
| `docs/design/figma-make-reference/prototype-src/src/app/components/OpportunitiesView.tsx` | Finance opportunity list and creation modal reference. |
| `docs/design/figma-make-reference/prototype-src/src/app/components/NetworkCanvas.tsx` | Network graph/canvas cockpit reference. |
| `docs/design/figma-make-reference/prototype-src/src/app/components/LedgerView.tsx` | Ledger and profit/loss visual explanation reference. Do not copy any fixed-return-like behavior. |
| `docs/design/figma-make-reference/prototype-src/src/app/components/AuditView.tsx` | Audit, hash verification, evidence pack, and closure verification reference. Never copy fake verified Fabric state. |
| `docs/design/figma-make-reference/prototype-src/src/app/components/IntegrationsView.tsx` | Outbox, reconciliation, adapters, webhooks, retry, and degraded-state reference. |
| `docs/design/figma-make-reference/prototype-src/src/app/components/OperationsView.tsx` | Deployment health, runtime services, environment, backup, and UAT reference. |
| `docs/design/figma-make-reference/prototype-src/src/app/components/AdminView.tsx` | Users, roles, residency, feature flags, and API clients reference. |
| `docs/design/figma-make-reference/prototype-src/src/app/components/ReportsView.tsx` | Procurement, finance, audit, and integration reports reference. |
| `docs/ui/assets/figma-make-screen-*.png` | Captured screenshots of the Make UI from local reconstruction. Use for quick visual comparison without running the Make source. |

## Production Frontend Files To Inspect

Inspect these before implementing UI/UX changes.

| File or folder | Function / purpose |
|---|---|
| `apps/web/src/app/App.tsx` | Production app entry component. Should remain small and route/provider oriented. |
| `apps/web/src/app/router.tsx` | Production routing. Inspect before adding or changing screens. |
| `apps/web/src/app/navigation.ts` | Route metadata and sidebar navigation source. Required for role-aware menu changes. |
| `apps/web/src/app/authorization.ts` | Frontend permission and route visibility logic. Required before adding protected UI. |
| `apps/web/src/app/session.ts` | Session shape and role/permission claim handling. |
| `apps/web/src/features/auth/` | Dev auth provider, login page, protected route wrapper, session storage, and auth hooks. Do not bypass this from feature screens. |
| `apps/web/src/layouts/` | Production app shell, sidebar, page header, and module layout components. UI shell improvements should start here. |
| `apps/web/src/shared/components/` | Shared UI primitives: button, field, status badge, data card, table, tabs, loading, empty, error, confirm dialog, workflow stepper. Reuse these instead of creating one-off patterns. |
| `apps/web/src/shared/api/` | Central API/data layer, HTTP client, query client, endpoint helpers, error parsing, and generated OpenAPI placeholder. Avoid raw fetch in page components. |
| `apps/web/src/shared/utils/formatting.ts` | Shared date, currency, and display formatting. Use this for consistent UI text. |
| `apps/web/src/shared/toast/` | Toast provider and hooks for success/error feedback. |
| `apps/web/src/features/dashboard/` | Role dashboard, KPI grid, smart task inbox, dashboard model, fixtures, and tests. |
| `apps/web/src/features/organization/OrgSetup.tsx` | Production organization setup screen. Compare with Figma onboarding wizard before polishing. |
| `apps/web/src/features/identity/` | Users and roles admin screens. Needed for admin UI/UX planning. |
| `apps/web/src/features/procurement/` | Procurement routes, API hooks, page, requisition components, navigation, validation, and tests. |
| `apps/web/src/features/evidence/` | Evidence routes and API hooks for documents, evidence items, packs, hashes, and audit timeline. |
| `apps/web/src/features/audit/` | Audit screen and audit verification model/tests. Required for tamper-evidence UX. |
| `apps/web/src/features/finance/` | Finance routes, applications, workspace, opportunities, ledger model, closures/contracts/disbursement/profit-loss hooks. Main area for mudarabah UI/UX work. |
| `apps/web/src/features/graph/` | Network graph/canvas route, model, fixtures, API hook, and permission-filtering tests. |
| `apps/web/src/features/integrations/` | Integration status route, API hook, status cards, and tests. Required for outbox/adapter UX. |
| `apps/web/src/features/operations/` | Operations health route. Required for deployment/runtime UI. |
| `apps/web/src/test/fixtures/sessions.ts` | Test sessions for role-specific UI behavior. Use when adding route/menu/component tests. |

## Backend/API Files To Inspect For UI Contracts

UI work must check backend reality before promising a screen action works.

| File or folder | Function / purpose |
|---|---|
| `apps/api/src/main.ts` | API bootstrap, global prefix, CORS, and OpenAPI/runtime setup. |
| `apps/api/src/health/` | Health endpoint used by the dashboard and smoke tests. |
| `apps/api/src/modules/auth/` | Dev auth and future OIDC boundary. Required before login/session UI changes. |
| `apps/api/src/organizations/`, `apps/api/src/users/`, `apps/api/src/roles/`, `apps/api/src/memberships/` | Identity and organization APIs used by setup/admin screens. |
| `apps/api/src/modules/procurement/` | Procurement APIs for projects, suppliers, requisitions, RFQs, quotations, POs, receipts, invoices, matching, and operations. |
| `apps/api/src/modules/evidence/` | Document, version, evidence item, evidence pack, hash record, and object storage APIs. |
| `apps/api/src/modules/finance/` | Opportunities, applications, evidence checklists, due diligence, Shariah review, contracts, disbursements, ledgers, P/L, and closures APIs. |
| `apps/api/src/modules/audit/` and `apps/api/src/audit-events/` | Audit hashing and audit event APIs. Required for timeline and verification screens. |
| `apps/api/src/modules/graph/` | Graph read-model API used by network canvas. |
| `apps/api/src/modules/integrations/` | Adapter-facing APIs for Fabric, ERP, e-signature, finance API, webhooks, and integration status. |
| `apps/api/src/modules/outbox/` | Outbox and Redis queue services. Required before showing external side-effect state. |
| `apps/api/src/database/prisma.service.ts` and `apps/api/prisma/schema.prisma` | Database access and schema. Check before designing fields, filters, or workflow state displays. |

## Testing And Review Documents

| File | Function / purpose |
|---|---|
| `docs/testing/testing-strategy.md` | Defines static checks, unit/component/integration/E2E expectations, accessibility checks, and deployment smoke tests. |
| `docs/testing/test-report-template.md` | Current verification report template/results. Update after major UI changes. |
| `docs/testing/e2e-system-tests.md` | E2E testing baseline and workflow coverage direction. |
| `docs/testing/uat-readiness.md` | UAT prerequisites and readiness state. |
| `docs/testing/uat-scenario-checklist.md` | UAT scenario checklist by role/workflow. |
| `docs/testing/uat-defect-log.md` | Defect tracking during UAT. |
| `docs/testing/uat-feedback-and-supervisor-notes.md` | Reviewer/supervisor feedback record. |

## Architecture And Deployment Documents

These are lower priority for visual design, but required when UI changes affect
deployment, integration state, or architecture.

| File | Function / purpose |
|---|---|
| `docs/technology-stack.md` | Official stack summary. Use before adding UI libraries or tooling. |
| `docs/adr/ADR-0001-source-of-truth-order.md` | Explains conflict resolution between SRS, SDD, UI contract, Figma, and code. |
| `docs/adr/ADR-0002-figma-make-as-reference-only.md` | Explains why Figma Make is not production authority. |
| `docs/adr/ADR-011-implementation-stack.md` | Accepted implementation stack. |
| `docs/adr/ADR-012-integration-boundary.md` | Integration boundary and adapter/outbox safety. Required before external-effect UI. |
| `docs/adr/ADR-013-module-roadmap-feature-intake.md` | Feature intake discipline by module. Required before adding new UI areas. |
| `docs/deployment/azure-student-vm-deployment.md` | Azure Student VM deployment guide. Required when UI work affects deployment ports, environment variables, or smoke tests. |
| `docker-compose.prod.yml`, `deploy/`, `.env.production.example` | Production-style container deployment. Inspect before adding runtime assumptions to UI. |

## Current Repository Implementation Progress

### Overall state

The repository is a reviewable academic MVP/prototype. It is not a regulated
production financial system. It currently demonstrates the primary MEPN
workflow surfaces and selected backend integrations, with some frontend
fixtures and mock adapters still present.

### Frontend progress

Implemented or present:

- React + TypeScript + Vite frontend under `apps/web`.
- Production app shell with router, providers, route metadata, authorization,
  role-aware sidebar, and access-denied state.
- Dev authentication/session provider and login page.
- Shared component library for common buttons, fields, cards, tables, badges,
  tabs, loading, empty, error, confirm dialog, and workflow stepper.
- Central API/data layer with shared client, query client, endpoint helpers,
  error parsing, and feature hooks.
- Dashboard with role-aware KPIs and smart task inbox foundation.
- Organization setup screen.
- Identity users/roles admin foundations.
- Procurement module foundation with requisitions, API hooks, navigation, and
  validation.
- Evidence module API hooks for documents, evidence packs, hash records, and
  audit timeline.
- Audit screen plus verification model/tests for anchor states.
- Finance module foundations for opportunities, applications list, workspace,
  ledger/P&L, closures/contracts/disbursement/profit-loss hooks.
- Graph/canvas foundation with permission-filtered model and tests.
- Integrations and operations status surfaces.

Still incomplete or needs follow-up:

- Several screens still use fixtures or partial API-backed data.
- Full production OIDC is not integrated.
- Full application workspace decision mutations still need deeper backend/E2E
  coverage.
- Procurement RFQ/quotation/PO/receipt/invoice/matching needs further polish and
  full user-journey coverage.
- Admin and reports need stronger review-ready product surfaces.
- Mobile, accessibility, and keyboard behavior need dedicated verification.

### Backend/API progress

Implemented or present:

- NestJS API under `apps/api`.
- Health endpoint for API/database/Redis status.
- PostgreSQL/Prisma database access.
- Local/dev auth module with OIDC boundary placeholder.
- Organization, user, role, and membership APIs.
- Procurement APIs for the core source-to-pay entities.
- Evidence APIs for documents, evidence items, packs, hash records, and object
  storage.
- Finance APIs for opportunities, applications, evidence checklist, contracts,
  disbursements, ledgers, profit/loss, and closures.
- Audit event and audit hash services.
- Graph read-model API.
- Integration adapter modules for mock Fabric, ERP, e-signature, finance API,
  webhooks, status, outbox, and Redis queue.

Still incomplete or needs follow-up:

- Backend permission checks should be confirmed for every mutation.
- Real OIDC, real Fabric Gateway, real ERP, real e-signature, and real finance
  provider integrations are not complete.
- Some UI summary screens need dedicated backend DTOs instead of fixtures.
- Full integration/E2E test coverage is not recorded as complete.

### Testing and deployment progress

Implemented or present:

- Root scripts for lint, typecheck, unit tests, integration tests, E2E tests,
  build, and verify.
- Unit/model/component tests across authorization, dashboard, finance,
  procurement, graph, audit verification, and integration status.
- Testing strategy and UAT documentation.
- Docker Compose for local infrastructure.
- Production-style Docker Compose, Dockerfiles, nginx config, and Azure Student
  VM deployment guide.
- GitHub Actions CI and Azure VM deployment workflow files.

Still incomplete or blocked:

- Full Playwright E2E latest run is not recorded as complete.
- Production Docker build was previously blocked by Docker Desktop daemon
  instability.
- Azure VM manual deployment and smoke-test evidence still need to be captured
  if not already done after the last tracker update.
- GitHub Actions CI/deploy runs need confirmation from GitHub after push.

## Recommended Reading Flow For A New UI/UX Task

Use this flow for every future UI/UX slice:

1. Read `AGENTS.md`.
2. Read the relevant SRS section in
   `docs/requirements/mudarabah_eprocurement_srs.tex`.
3. Read the relevant SDD section in
   `docs/design/mepn_software_design_description.tex`.
4. Read the relevant UI contract section in
   `docs/ui/mepn-ui-contract-flow.md` and appendix.
5. Read `docs/ui/current-vs-figma-web-ui-workflow.md` for the current/Figma
   gap.
6. Read the matching Figma Make component and screenshot only as a visual
   reference.
7. Inspect the current production frontend feature folder.
8. Inspect the matching backend/API module.
9. Check existing tests and fixtures.
10. Produce a gap analysis and implementation plan before editing.

## Implementation Safety Rules For UI/UX Work

- Do not import from `docs/design/figma-make-reference/prototype-src/` into
  production code.
- Do not copy prototype role switching as production authentication.
- Do not copy fake Fabric anchoring, fake approval, fake disbursement, fake
  ledger closure, or fake integration success.
- Do not turn local prototype state into production persistence.
- Keep backend/API state as the source of truth for workflow status.
- Keep route/RBAC visibility centralized in the production route/navigation
  system.
- Add loading, empty, error, and permission-denied states for every new screen.
- Add or update tests for every feature slice.
- Update documentation when behavior changes.

## Best Next UI/UX Planning Targets

Based on the current docs and implementation state, the highest-value next UI/UX
planning targets are:

1. Shell/dashboard visual alignment with the Figma Make density while preserving
   production route/RBAC architecture.
2. Procurement Hub landing screen with KPI cards, exception alerts, and clear
   drill-down to existing procurement detail routes.
3. Application Workspace polish: lifecycle stepper, evidence progress, role
   guidance, blocked-state explanations, due diligence and Shariah review
   clarity.
4. Audit/verification reviewer UX: status legend, canonical hash explanation,
   source-record links, and honest Fabric state wording.
5. Ledger/P&L reviewer UX: clearer calculation explanation, no-guaranteed-return
   note, and loss exception states.
6. Integrations/operations UX: outbox attempts, idempotency keys, retry status,
   reconciliation, adapter health, queue/worker/deployment health.
7. Admin and reports screens for final demo completeness.
