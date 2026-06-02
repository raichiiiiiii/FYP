# Official Technology Stack

Status: official MVP baseline, accepted by [ADR-011](adr/ADR-011-implementation-stack.md)
Decision date: 2026-06-02

This file records the implementation stack for MEPN/FYP so future development can follow one agreed direction. It is based on the SRS and SDD in this repository:

- [Mudarabah E-Procurement SRS](requirement/mudarabah_eprocurement_srs.tex)
- [MEPN Software Design Description](design/mepn_software_design_description.tex)

This resolves SDD OQ-01 for frontend, backend, workers, and migrations. The stack is no longer an open question for the MVP.

## Design Drivers

The chosen stack must support:

- A distributed, self-hostable modular monolith for the MVP.
- REST APIs documented with OpenAPI.
- Local/dev authentication for the first runnable version, followed by OAuth 2.0 and OpenID Connect integration.
- Role, organization, and workspace-scoped authorization.
- PostgreSQL as the transactional source of truth.
- Object storage for documents, signed artifacts, and evidence packs.
- Redis-backed queues, retries, cache, and locks.
- Background workers for ERP, Fabric, e-signature, finance API, and webhook effects.
- Hyperledger Fabric hash-only audit anchoring.
- Docker Compose deployment for SMEs, with Helm/Kubernetes as a future managed deployment option.
- A Miro-like graph/canvas for supply-chain and financing visibility.

## Official Stack

| Area | Official choice | Notes |
| --- | --- | --- |
| Repository model | pnpm workspace monorepo | Keeps web, API, workers, shared schemas, database, and infrastructure in one coordinated project. |
| Primary language | TypeScript on Node.js LTS | One main application language across frontend, backend, worker, validation, and generated API clients. |
| Frontend app | React + TypeScript + Vite | Suitable for a browser-based workflow application served behind the API/BFF layer. |
| Frontend routing | React Router | Handles role-specific application routes and workspace pages without requiring server-rendered pages. |
| Frontend data access | TanStack Query | Standardizes API fetching, caching, mutation states, retries, and invalidation. |
| Forms and validation | React Hook Form + Zod | Supports complex procurement, finance, and checklist forms with reusable validation schemas. |
| UI system | Tailwind CSS + shadcn/ui + Radix UI + lucide-react | Accessible, composable components for dense operational screens, tables, dialogs, tabs, and toolbars. |
| Tables | TanStack Table | Required for procurement lists, quotations, invoices, ledgers, audit logs, and review queues. |
| Graph/canvas | React Flow (`@xyflow/react`) | Official choice for the network canvas. It supports nodes, edges, dragging, grouping, custom node renderers, and interactive graph workflows. |
| Graph layout helpers | Dagre first; ELK optional | Dagre is enough for MVP auto-layout. ELK can be added for complex multi-level graph layout. |
| API/backend framework | NestJS + TypeScript | Matches the modular monolith design, supports dependency injection, bounded modules, OpenAPI, guards, interceptors, and background processors. Fastify can be used as the NestJS HTTP adapter. |
| API style | REST + OpenAPI | Required by the SRS/SDD. OpenAPI is the contract for external clients and generated frontend clients. |
| API validation | Zod via NestJS integration | Keeps request/response validation close to shared frontend schemas where practical. |
| Database | PostgreSQL | Transactional source of truth for procurement, finance, identity, audit, graph, and integration state. |
| ORM and migrations | Prisma ORM + Prisma Migrate | Type-safe data access with explicit migrations. Raw SQL migrations are allowed for indexes, audit constraints, PostgreSQL extensions, RLS, and performance tuning. |
| Queue/cache/locks | Redis + BullMQ | Handles outbox processing, integration retries, cache, idempotency coordination, and distributed locks. |
| Object storage | MinIO for self-hosted Docker Compose; S3-compatible storage for managed deployments | Stores document payloads, signed artifacts, evidence packs, and export files. |
| Search | PostgreSQL full-text search for MVP; Meilisearch optional for advanced search | Keeps MVP simpler while preserving an upgrade path for audit/document search at scale. |
| Authentication | Local/dev auth first, then OAuth/OIDC integration | Keeps the first runnable FYP version simple while preserving the SRS requirement for OAuth/OIDC. A bundled OIDC provider can be introduced when OIDC is enabled. |
| Authorization model | NestJS guards + policy services + database-scoped organization/workspace checks | Enforces access at gateway/API, service, and data-access layers as required by the SDD. |
| Background workers | NestJS worker modules + BullMQ processors | Runs outbox jobs, ERP sync, Fabric anchoring, e-signature callbacks, finance API polling, webhooks, backups, and exports. |
| ERP/integration adapters | NestJS adapter modules with typed REST clients and OpenAPI-generated clients where available | Keeps provider-specific systems outside the domain model. CSV/XLSX fallback remains supported. |
| CSV/XLSX import-export | SheetJS (`xlsx`) | Supports SMEs without mature ERP APIs. |
| Fabric integration | Hyperledger Fabric Gateway SDK for Node.js | Application-side Fabric connector for submitting hash anchor transactions and recording transaction references. |
| Fabric chaincode | Go chaincode for audit anchors | Fabric-side logic is limited to event hashes, metadata, and verification references. Full confidential payloads stay off-chain. |
| E-signature integration | Provider-neutral adapter with signed callbacks | First provider is not fixed yet; the stack defines the adapter shape only. |
| Financial entity/payment API integration | Provider-neutral adapter with idempotency keys and reconciliation state | First financial API is a product decision, not a stack decision. |
| Evidence PDF export | Server-rendered HTML templates printed to PDF with Playwright | Produces reviewable evidence packs while keeping PDF layout under application control. |
| JSON evidence export | Zod/JSON Schema-backed package format | Supports machine-readable evidence packs and audit verification. |
| Reverse proxy/TLS | Caddy for Docker Compose | Simple self-hosted reverse proxy with TLS support. Managed deployments may use ingress controllers. |
| Deployment | Docker Compose for MVP | Required baseline for SME installation. |
| Future deployment | Helm charts on Kubernetes | Reserved for financial entities, managed consortium operators, or larger deployments. |
| Observability | OpenTelemetry + Prometheus + Grafana + Loki | Covers traces, metrics, dashboards, logs, health checks, queue depth, adapter failures, and pending Fabric anchors. |
| Application logging | Pino structured logs | Supports correlation IDs, actor IDs, organization/workspace context, and event/error codes. |
| Testing | Vitest, Testing Library, Playwright, Testcontainers, k6 | Unit/component tests, browser workflows, integration tests with real services, and performance checks. |
| Accessibility checks | Playwright + axe-core | Supports WCAG 2.1 AA-oriented review for core workflows. |
| CI/CD | GitHub Actions | Runs linting, type checks, tests, image builds, dependency reports, and deployment checks. |
| Security scanning | Dependabot, CodeQL, Trivy, pnpm audit | Supports dependency scanning and vulnerability reporting required by the SRS. |
| Development containers | Docker Compose dev profile | Provides PostgreSQL, Redis, MinIO, optional OIDC provider, Meilisearch when enabled, and Fabric test components. |

## Initial Source Layout

Future code should follow this structure unless a later ADR changes it:

```text
apps/
  web/                 React + Vite frontend
  api/                 NestJS API/BFF and modular monolith
  worker/              Separate NestJS/Node worker application
packages/
  shared/              Shared TypeScript types, Zod schemas, constants
  db/                  Prisma schema, migrations, seed data
  integrations/        Shared adapter contracts and generated clients
  fabric/              Fabric gateway helpers and anchor contracts
infra/
  docker/              Docker Compose files and service config
  helm/                Future Kubernetes Helm charts
docs/
  technology-stack.md  Official stack reference
  adr/                 Accepted architecture decision records
```

## MVP Provider Decisions

These are stack decisions:

- Local/dev authentication is used for the first runnable implementation.
- OAuth/OIDC integration is required after the local/dev baseline is working.
- MinIO is the default self-hosted object store.
- Caddy is the default Docker Compose reverse proxy.
- React Flow is the official graph/canvas library.
- PostgreSQL, Redis, and Docker Compose are mandatory MVP infrastructure.

These are not fixed by the stack yet:

- First ERP/accounting system adapter.
- First financial entity or payment API.
- First e-signature provider.
- Exact legal/Shariah contract template source.
- Whether PostgreSQL row-level security is mandatory for MVP.
- Future plugin sandbox implementation.

## Non-Goals

- Do not split the MVP into microservices unless a later ADR explicitly changes the architecture.
- Do not store confidential procurement documents, bank details, quotations, invoices, or contracts directly on Fabric.
- Do not replace PostgreSQL with Fabric, object storage, or a document database as the transactional source of truth.
- Do not require Kubernetes for SME MVP deployments.
- Do not bind the domain model to one ERP, bank, or e-signature provider.

## Versioning Policy

This document names the official technologies and version families. Exact package versions, Docker image tags, and runtime versions must be pinned in lockfiles, Dockerfiles, and Compose files when implementation begins.
