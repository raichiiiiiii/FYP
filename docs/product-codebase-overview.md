# MEPN Product Vision And Codebase Overview

## Purpose

This document explains how the MEPN codebase supports the product vision. It is
intended for reviewers, supervisors, developers, and future agentic coding tools
that need to understand the relationship between the implementation, the
requirements, and the current prototype limitations.

MEPN is a Mudarabah-Enabled Procurement Network. It connects procurement
records, evidence, auditability, and restricted mudarabah financing workflows in
one self-hostable application.

## Product Vision

The product vision is to help SMEs turn trusted procurement activity into
reviewable financing workflows.

The core workflow is:

```text
Organization and users
  -> procurement records
  -> evidence and audit trail
  -> revenue-generating opportunity
  -> mudarabah application
  -> financier review
  -> Shariah/compliance review
  -> contract/disbursement state
  -> project ledger
  -> profit/loss and closure evidence
```

The important product principles are:

- Procurement must be the evidence base for finance.
- Mudarabah financing must not become a fixed-return debt workflow.
- Financier and Shariah review gates must remain separate.
- Audit and evidence states must be visible and honest.
- Fabric anchoring must not be shown as successful unless there is proof.
- Integrations must be isolated behind adapters and outbox processing.
- The system should run as a self-hostable SME node for MVP demonstration.

## Source Of Truth

The implementation follows this repository source-of-truth order:

1. `docs/requirements/mudarabah_eprocurement_srs.tex`
2. `docs/design/mepn_software_design_description.tex`
3. `docs/ui/mepn-ui-contract-flow.md`
4. `docs/ui/mepn-ui-contract-flow-appendix.md`
5. `docs/ui/figma-to-ui-contract-map.md`
6. `docs/design/figma-make-reference/`
7. Existing production code

The Figma Make export is a visual and interaction reference only. It should be
used to understand layout, screen composition, density, and navigation style. It
must not override business rules, authorization, validation, audit behavior,
ledger calculations, Fabric anchoring rules, or deployment behavior.

## Codebase Shape

The repository is a pnpm workspace monorepo.

```text
apps/
  web/      React + TypeScript + Vite frontend
  api/      NestJS REST API
  worker/   NestJS worker for outbox and integration jobs

packages/
  shared/   Shared DTOs, constants, enums, validation schemas
  config/   Shared configuration utilities

infra/
  docker-compose.yml for local PostgreSQL, Redis, and MinIO

deploy/
  Dockerfiles and nginx config for VM deployment

docs/
  requirements, design, UI contract, ADRs, testing, deployment, demo docs
```

The stack is documented in `docs/technology-stack.md` and
`docs/adr/ADR-011-implementation-stack.md`.

## Frontend Codebase

Frontend location:

```text
apps/web/
```

The frontend is a React + TypeScript + Vite application. Its job is to provide
the role-aware operating surface for procurement, evidence, finance, audit,
graph, integrations, and operations.

Important frontend areas:

| Area | Path | Responsibility |
|---|---|---|
| App wiring | `apps/web/src/app/` | Routing, navigation metadata, authorization helpers, app providers |
| Layout | `apps/web/src/layouts/` | App shell, sidebar, page headers, module layout |
| Shared UI/API | `apps/web/src/shared/` | API client utilities, common types, shared UI patterns |
| Dashboard | `apps/web/src/features/dashboard/` | Role-aware dashboard and smart task inbox |
| Procurement | `apps/web/src/features/procurement/` | Requisition and procurement workflow surfaces |
| Finance | `apps/web/src/features/finance/` | Opportunities, applications, workspace, ledger, closure |
| Audit | `apps/web/src/features/audit/` | Audit events and verification state display |
| Graph | `apps/web/src/features/graph/` | Network/canvas relationship view |
| Integrations | `apps/web/src/features/integrations/` | Adapter/outbox/integration status views |
| Operations | `apps/web/src/features/operations/` | Deployment and operational health surfaces |

The frontend is intentionally structured around modules because future features
must enter through the module roadmap rather than becoming mixed demo logic.

## Backend API Codebase

API location:

```text
apps/api/
```

The API is a NestJS application. It combines the MVP API gateway/BFF and backend
application into one modular service.

Current backend responsibilities include:

- health checks for API, PostgreSQL, and Redis
- local/dev authentication and session support
- organization, user, role, membership, and workspace foundations
- procurement records and state transitions
- evidence documents, evidence packs, hash records, and audit events
- finance opportunities, applications, reviews, contracts, disbursement state,
  ledgers, profit/loss, and closure records
- graph read-model endpoints
- integration/outbox adapter endpoints

The API uses Prisma for database schema and migrations. The operational
database is PostgreSQL.

## Worker Codebase

Worker location:

```text
apps/worker/
```

The worker is a separate NestJS application context. Its role is to keep
external side effects out of core request/response workflows.

Worker responsibility:

```text
Poll pending outbox events
  -> claim an event
  -> call the matching adapter
  -> store external reference or reconciliation result
  -> mark completed or retry later
```

This supports the product principle that Fabric, ERP, e-signature, finance API,
webhook, and other external integrations should not pollute core business logic.

## Infrastructure And Deployment

Local infrastructure:

```text
infra/docker-compose.yml
```

Production-style VM deployment:

```text
docker-compose.prod.yml
deploy/frontend.Dockerfile
deploy/api.Dockerfile
deploy/worker.Dockerfile
deploy/nginx/nginx.conf
deploy/nginx/frontend.conf
```

The production compose topology is:

```text
Browser
  -> Nginx reverse proxy on port 80
  -> frontend container
  -> API container
  -> worker container
  -> PostgreSQL
  -> Redis
  -> MinIO
```

Deployment instructions are documented in:

```text
docs/deployment/azure-student-vm-deployment.md
```

GitHub Actions CI and deployment workflows are located in:

```text
.github/workflows/ci.yml
.github/workflows/deploy-azure-vm.yml
```

The deployment workflow assumes the first manual deployment has already
succeeded and `/opt/mepn/.env.production` already exists on the VM.

## How The Codebase Supports The Product Vision

| Product capability | Codebase support | Current status |
|---|---|---|
| Role-aware operating shell | Frontend route metadata, authorization helpers, sidebar, protected routes | Implemented as frontend foundation |
| Organization ownership | API organization/user/role/membership models and frontend setup flow | Implemented for local/dev identity |
| Procurement evidence base | Procurement API modules and frontend requisition/procurement screens | Foundation implemented; advanced procurement flows remain incomplete |
| Financing opportunity | Finance opportunity screens and validation model | Foundation implemented; backend completeness depends on current endpoint coverage |
| Mudarabah application workspace | Finance application list/workspace, lifecycle, evidence and review surfaces | Implemented as reviewable frontend foundation |
| Ledger and profit/loss | Ledger models and display logic | Implemented as domain-safe display; no guaranteed fixed return |
| Audit/evidence visibility | Audit, evidence, hash, anchor status surfaces | Implemented with honest status distinctions |
| Fabric/integration control | Outbox events, worker, mock adapters, integration status UI | Mock/adapter-first foundation |
| Graph/canvas cockpit | Permission-filtered graph/canvas frontend foundation | Read-model/fixture-based foundation |
| Azure Student VM deployment | Docker Compose production files and deployment guide | Ready for manual execution; live VM smoke test not recorded |

## Current Prototype Status

The project is suitable for academic/product review as an MVP prototype. It can
be inspected, run locally, tested, and prepared for Azure Student VM deployment.

Latest local verification recorded in `docs/testing/test-report-template.md`:

```bash
corepack pnpm verify
```

That command runs lint, frontend typecheck, unit/component tests, and builds for
the web, API, and worker apps.

## Known Mocks, Fixtures, And Placeholders

The current implementation must not be overstated.

Known limitations:

- Some frontend views use typed fixtures or local/demo state where backend
  aggregation is not complete.
- Local/dev auth exists; full OAuth/OIDC integration remains future work.
- Fabric anchoring is represented through explicit status states such as
  pending, submitted, verified, failed, and unavailable. Real Fabric Gateway
  integration is not complete.
- ERP, e-signature, finance API, webhook, and payment integrations are adapter
  or mock oriented unless configured later.
- Real payment, disbursement, and ledger closure should not be treated as
  successful unless backed by implemented backend state and audit records.
- Azure Student VM deployment is single-node and not production-grade.
- Real financial customer data must not be used without security, legal,
  Shariah, privacy, and regulatory review.

## How To Read The Repository

Recommended review order:

1. Read `README.md` for the high-level project entry point.
2. Read `AGENTS.md` for operating rules and source-of-truth order.
3. Read the SRS and SDD for requirements and architecture.
4. Read the UI flow contract for behavior.
5. Use the Figma reference only for visual and interaction intent.
6. Inspect `apps/web/src/app` and `apps/web/src/features` for frontend flow.
7. Inspect `apps/api/src` and `apps/api/prisma/schema.prisma` for backend
   entities and API modules.
8. Inspect `apps/worker/src` for outbox processing.
9. Read `docs/testing/test-report-template.md` for verification status.
10. Read `docs/demo-script.md` for the assessment/demo path.
11. Read `docs/deployment/azure-student-vm-deployment.md` for cloud deployment.

## Future Direction

The next implementation work should stay slice-based and follow
`docs/implementation-plan.md`.

High-value next steps:

- complete backend contracts for advanced procurement and finance mutations
- replace remaining fixtures with API-backed data
- complete role-scoped finance review actions
- add downloadable evidence pack output and document storage UX
- run and record full Playwright E2E/UAT flows
- complete first manual Azure VM deployment and record smoke-test outputs
- add real OIDC only after local/dev auth flows are stable
- replace mock integration adapters only after outbox behavior is stable
