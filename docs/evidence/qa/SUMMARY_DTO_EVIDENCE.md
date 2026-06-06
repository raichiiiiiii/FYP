# Summary DTO Evidence

## Scope

This evidence package covers the richer dashboard, procurement, and finance
summary DTO implementation for FYP review scope.

## Implemented Evidence

| Area | Evidence |
|---|---|
| Shared DTO contract | `docs/api/summary-dto-contract.md` and `apps/api/src/modules/summary/summary-contract.ts` define metrics, queue items, blockers, readiness, and role visibility helpers. |
| Dashboard summary | `GET /api/v1/dashboard/summary` returns role-aware `metrics`, `queue`, `blockers`, and `readiness` while preserving filtered legacy dashboard arrays. |
| Procurement summary | `GET /api/v1/procurement/summary` returns backend-owned procurement metrics, queue, blockers, readiness, and requisition status breakdown. |
| Finance summary | `GET /api/v1/finance/summary` returns backend-owned finance metrics, lifecycle queues, blockers, readiness, and application status breakdown. |
| UI evidence | Procurement Hub and finance opportunities consume backend summary DTOs. |

## Verification Commands

| Command | Result | Notes |
|---|---|---|
| `corepack pnpm --dir apps/api test:unit -- summary-contract` | Pass | Shared DTO helper coverage. |
| `corepack pnpm --dir apps/api test:unit -- dashboard.service` | Pass | Dashboard role-filtered summary fields. |
| `corepack pnpm --dir apps/api test:integration -- dashboard.integration` | Pass | Dashboard HTTP summary behavior. |
| `corepack pnpm --dir apps/api test:unit -- procurement-operations.service` | Pass | Procurement summary service behavior. |
| `corepack pnpm --dir apps/api test:integration -- procurement-summary.integration` | Pass | Procurement summary HTTP and 403 behavior. |
| `corepack pnpm --dir apps/api test:unit -- finance-summary` | Pass | Finance summary service behavior. |
| `corepack pnpm --dir apps/api test:integration -- finance-summary.integration` | Pass | Finance summary HTTP and 403 behavior. |
| `corepack pnpm --dir apps/web test -- summary procurementHub opportunities` | Pass | Frontend summary helper and existing feature model tests. |
| `corepack pnpm test:e2e -- tests/e2e/20-summary-api-ui.spec.ts` | Pass | Browser evidence for procurement and finance summary rendering. |
| `corepack pnpm lint` | Pass | Workspace lint passed. |
| `corepack pnpm typecheck` | Pass | Frontend TypeScript project passed. |
| `corepack pnpm build` | Pass | Web, API, and worker builds passed. |

## Screenshots

| Screenshot | Notes |
|---|---|
| `docs/evidence/uat/summary-procurement-hub.png` | Procurement Hub showing backend summary KPIs, queue, and readiness. |
| `docs/evidence/uat/summary-finance-panel.png` | Finance opportunities page showing backend finance summary and blockers. |

## Review Notes

- Summary values are API-backed, not copied from Figma Make fixtures.
- Role filtering is enforced by backend summary endpoints.
- Procurement-only roles are denied finance summary access.
- Finance-only roles are denied procurement summary access.
- Summary copy avoids claiming guaranteed/fixed mudarabah returns.
- Supplier scoring, spend trends, maverick-spend analytics, and deeper risk
  scoring remain post-demo hardening items.
