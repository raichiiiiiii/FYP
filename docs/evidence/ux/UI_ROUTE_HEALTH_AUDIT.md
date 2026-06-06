# UI Route Health Audit

Date: 2026-06-06

## Scope

This audit records UI route health for the reviewer-delighter sprint and the UI/HCI recovery workstream.

Audited routes:

| Route | Baseline result | After evidence |
| --- | --- | --- |
| `/dashboard` | Pass | `docs/evidence/ux/screenshots/after-dashboard.png` |
| `/finance/opportunities` | Pass | `docs/evidence/ux/screenshots/after-finance-opportunities.png` |
| `/finance/applications` | Pass; layout overflow reproduced in assigned-route interaction check | `docs/evidence/ux/screenshots/after-finance-applications.png` |
| `/finance/contracts` | Pass | `docs/evidence/ux/screenshots/after-finance-contracts.png` |
| `/graph/projects` | Pass | `docs/evidence/ux/screenshots/after-graph-projects.png` |
| `/operations` | Pass | `docs/evidence/ux/screenshots/after-operations.png` |

No `before-...-error.png` screenshots were produced by Agent B because all six reported routes passed the baseline route-health failure criteria. The route-health spec will create those screenshots automatically if a future route run detects an unhealthy route.

## Source Of Truth Notes

- SRS: dashboard, finance, graph/canvas, and operations surfaces support evidence-driven procurement-finance workflows, role-aware visibility, and observability.
- SRS UC-13 and FR-43 to FR-46 require authorized graph/canvas visibility, filters, node detail, saved view behavior, and graph access control.
- SRS UC-01 plus NFR-10, NFR-13, and NFR-19 to NFR-22 require installable deployment support, health checks, observability, backup/deployment readiness, and safe operations visibility.
- SDD: web application covers procurement, finance, canvas, and audit UI; Graph/Canvas must remain authorization-aware; operations must surface runtime and integration health without exposing secrets.
- UI contract: route visibility and screen contracts cover `/dashboard`, `/finance/opportunities`, `/finance/applications`, `/finance/contracts`, `/graph/projects`, and `/operations`.
- Figma Make references were used only as visual/interaction references; authorization, workflow state, API contracts, audit behavior, Fabric anchoring, ledger calculations, and deployment behavior remain governed by source-of-truth docs and production code.

## Baseline Method

Agent B added `tests/e2e/00-route-health.spec.ts` as a route smoke regression. The spec:

- creates a fresh E2E organization and ORG_ADMIN session for each route;
- opens each route through the production router;
- checks rendered text for `Internal Server Error`, `Application Error`, `Unhandled Runtime Error`, `500`, and stack-trace indicators;
- records sanitized console warnings/errors, page errors, failed requests, and HTTP 5xx responses;
- captures a `before-...-error.png` screenshot only when a route is unhealthy.

Baseline command:

```powershell
corepack pnpm test:e2e -- tests/e2e/00-route-health.spec.ts
```

Baseline result: passed on 2026-06-06.

| Route | Result | Rendered forbidden text | Runtime/network finding | Baseline screenshot |
| --- | --- | --- | --- | --- |
| `/dashboard` | Pass | None found | None failing | Not captured; route healthy |
| `/finance/opportunities` | Pass | None found | None failing | Not captured; route healthy |
| `/finance/applications` | Pass | None found | None failing | Not captured; route healthy |
| `/finance/contracts` | Pass | None found | None failing | Not captured; route healthy |
| `/graph/projects` | Pass | None found | None failing | Not captured; route healthy |
| `/operations` | Pass | None found | None failing | Not captured; route healthy |

## Dashboard And Finance Findings

Agent C verified `/dashboard`, `/finance/opportunities`, `/finance/applications`, and `/finance/contracts` with route-specific content checks and one lightweight interaction per route.

Browser plugin note: the in-app browser backend returned `Browser is not available: iab`, so verification and screenshots used the repo Playwright path.

| Route | Result | Root-cause classification | Evidence |
| --- | --- | --- | --- |
| `/dashboard` | Pass | Not reproduced / healthy under local route-health criteria. | `docs/evidence/ux/screenshots/after-dashboard.png` |
| `/finance/opportunities` | Pass | Not reproduced / healthy under local route-health criteria. | `docs/evidence/ux/screenshots/after-finance-opportunities.png` |
| `/finance/applications` | Pass after fix | Reproduced CSS layout overflow: the application pipeline card grid exceeded the content shell at the Playwright desktop viewport, clipping the `Open workspace` action. Fixed by wrapping the card grid into two rows before overflow. | `docs/evidence/ux/screenshots/after-finance-applications.png` |
| `/finance/contracts` | Pass | Not reproduced / healthy under local route-health criteria. | `docs/evidence/ux/screenshots/after-finance-contracts.png` |

## Graph And Operations Findings

Agent D verified `/graph/projects` and `/operations` using existing route-specific E2E coverage after Agent A committed the Graph Annotation API.

| Route | Result | Root-cause classification | Evidence | Notes |
| --- | --- | --- | --- | --- |
| `/graph/projects` | Pass | Not reproduced / healthy under local route-health criteria. | `docs/evidence/ux/screenshots/after-graph-projects.png` | Existing graph E2E opens the project network canvas, exercises filters/saved views/source navigation, validates anchor overlays, and preserves role-based no-leak behavior for hidden finance nodes. |
| `/operations` | Pass | Not reproduced / healthy under local route-health criteria. | `docs/evidence/ux/screenshots/after-operations.png` | Existing operations E2E opens deployment/runtime health, filters the operations timeline, shows failed Fabric anchor state honestly, and verifies no PEM/password/token/private-key strings leak into the reviewer timeline. |

## Sanitized Diagnostics

- Dependency install: `corepack pnpm install --frozen-lockfile` completed successfully and generated Prisma client. During install, the optional native `pkcs11js` rebuild reported a missing Windows Visual Studio C++ toolset, but pnpm exited 0 and the E2E runs completed.
- Local services: E2E setup started Docker Compose dependencies, recreated `mepn_e2e`, and applied Prisma migrations.
- Route health: Playwright did not find the requested rendered error strings and did not fail on page errors, failed requests, or HTTP 5xx responses for the audited routes.
- Secret handling: diagnostics captured by the route-health spec redact bearer tokens, `sk-` keys, and query-string credentials before attachment or failure output.

## Validation Notes

Agent B:

- `corepack pnpm install --frozen-lockfile` passed.
- `corepack pnpm test:e2e -- tests/e2e/00-route-health.spec.ts` passed.
- `corepack pnpm lint` passed.
- `corepack pnpm typecheck` passed.
- `corepack pnpm test:unit` passed.
- `corepack pnpm test:integration` passed.
- `corepack pnpm build` passed.

Agent C:

- `corepack pnpm install --frozen-lockfile` passed.
- `corepack pnpm lint` passed.
- `corepack pnpm typecheck` passed.
- `corepack pnpm test:unit` passed.
- `corepack pnpm test:integration` passed.
- `corepack pnpm test:e2e -- tests/e2e/00-route-health.spec.ts` passed.
- `corepack pnpm build` passed.

Agent D:

- `corepack pnpm install --frozen-lockfile` passed.
- `corepack pnpm test:e2e -- tests/e2e/12-read-only-project-graph.spec.ts tests/e2e/24-operations-timeline.spec.ts` passed.
- `corepack pnpm lint` passed.
- `corepack pnpm typecheck` passed.
- `corepack pnpm test:unit` passed.
- `corepack pnpm test:integration` passed.
- `corepack pnpm build` passed.

Known non-blocking warnings:

- Optional `pkcs11js` native rebuild warning due missing VC++ toolset during install on Windows.
- Existing `pg@9` deprecation warning in integration tests.
- Existing Vite large chunk warning during web build.

## Blockers

No route-health blocker was observed for baseline, dashboard, finance, graph, or operations routes.

## Recommended Next Steps

- Keep `tests/e2e/00-route-health.spec.ts` as the first route smoke regression before UI/HCI work.
- Preserve route-specific interaction checks for finance routes because they caught a layout overflow that the broad error-string smoke check did not.
- Keep `tests/e2e/12-read-only-project-graph.spec.ts` as the graph no-leak regression guard when future graph UI work consumes the annotation API.
- If a future run creates `before-...-error.png` screenshots, update this audit with the route-specific screenshot filenames and sanitized console/network findings.
