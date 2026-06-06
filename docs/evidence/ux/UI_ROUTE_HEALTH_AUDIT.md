# UI Route Health Audit

Date: 2026-06-06
Agent: Agent B - UI/HCI Baseline + Route Health Evidence
Worktree: `C:\Users\User\dev\FYP-ui-hci-baseline`
Branch: `feature/ui-hci-recovery-baseline`

## Scope

This audit records the current UI route health baseline before product fixes. It does not modify product code and does not touch graph API or service files.

Routes under audit:

| Route | Evidence screenshot |
| --- | --- |
| `/dashboard` | `docs/evidence/ux/screenshots/before-dashboard-error.png` |
| `/finance/opportunities` | `docs/evidence/ux/screenshots/before-finance-opportunities-error.png` |
| `/finance/applications` | `docs/evidence/ux/screenshots/before-finance-applications-error.png` |
| `/finance/contracts` | `docs/evidence/ux/screenshots/before-finance-contracts-error.png` |
| `/graph/projects` | `docs/evidence/ux/screenshots/before-graph-projects-error.png` |
| `/operations` | `docs/evidence/ux/screenshots/before-operations-error.png` |

## Source Of Truth Notes

- SRS: dashboard, finance, graph/canvas, and operations surfaces support evidence-driven procurement-finance workflows, role-aware visibility, and observability.
- SDD: web application covers procurement, finance, canvas, and audit UI; Graph/Canvas must remain authorization-aware; operations must surface runtime and integration health without exposing secrets.
- UI contract: route visibility and screen contracts cover `/dashboard`, `/finance/opportunities`, `/finance/applications`, `/finance/contracts`, `/graph/projects`, and `/operations`.
- Figma Make references used only as visual/interaction references: `DashboardView.tsx`, `OpportunitiesView.tsx`, `ApplicationsList.tsx`, `ApplicationWorkspace.tsx`, `NetworkCanvas.tsx`, and `OperationsView.tsx`.

## Baseline Method

The Playwright spec `tests/e2e/00-route-health.spec.ts`:

- creates a fresh E2E organization and ORG_ADMIN session for each route;
- opens each route through the production router;
- checks rendered text for `Internal Server Error`, `Application Error`, `Unhandled Runtime Error`, `500`, and stack-trace indicators;
- records sanitized console warnings/errors, page errors, failed requests, and HTTP 5xx responses;
- captures a `before-...-error.png` screenshot only when a route is unhealthy.

## Results

Command run:

```powershell
corepack pnpm test:e2e -- tests/e2e/00-route-health.spec.ts
```

Result: passed on 2026-06-06.

| Route | Result | Rendered forbidden text | Runtime/network finding | Screenshot |
| --- | --- | --- | --- | --- |
| `/dashboard` | Pass | None found | None failing | Not captured; route healthy |
| `/finance/opportunities` | Pass | None found | None failing | Not captured; route healthy |
| `/finance/applications` | Pass | None found | None failing | Not captured; route healthy |
| `/finance/contracts` | Pass | None found | None failing | Not captured; route healthy |
| `/graph/projects` | Pass | None found | None failing | Not captured; route healthy |
| `/operations` | Pass | None found | None failing | Not captured; route healthy |

## Sanitized Diagnostics

- Dependency install: `corepack pnpm install --frozen-lockfile` completed successfully and generated Prisma client. During install, the optional native `pkcs11js` rebuild reported a missing Windows Visual Studio C++ toolset, but pnpm exited 0 and the E2E run completed.
- Local services: `docker compose -f infra/docker-compose.yml ps` showed `mepn-postgres`, `mepn-redis`, and `mepn-minio` running before E2E.
- E2E setup: `tests/e2e/setup-e2e.mjs` started Docker Compose dependencies, recreated `mepn_e2e`, and applied 9 Prisma migrations.
- Route health: the Playwright spec did not find the requested rendered error strings and did not fail on page errors, failed requests, or HTTP 5xx responses for the audited routes.
- Secret handling: diagnostics captured by the spec redact bearer tokens, `sk-` keys, and query-string credentials before attachment or failure output.

## Screenshots

No `before-...-error.png` screenshots were produced because all audited routes passed the unhealthy-route criteria. The spec will create screenshots under `docs/evidence/ux/screenshots/` if a future run detects a failure.

## Blockers

No route-health blocker was observed in this baseline run.

Residual environment note: the install log includes the optional `pkcs11js` native rebuild warning described above. It did not block this UI/HCI evidence slice.

Additional validation notes:

- `corepack pnpm lint` passed.
- `corepack pnpm typecheck` passed.
- `corepack pnpm test:unit` passed.
- `corepack pnpm test:integration` passed. Existing integration flow emitted repeated `pg@9` deprecation warnings about concurrent `client.query()` usage.
- `corepack pnpm build` passed. Vite emitted a large chunk warning for the web bundle.

## Recommended Next Steps

- Keep `tests/e2e/00-route-health.spec.ts` as the first route smoke regression before UI recovery fixes.
- If a future run creates screenshots, update this audit with the route-specific screenshot filenames and the sanitized console/network finding.
- Continue fixes in vertical slices, using the UI contract and production route metadata as behavioral authority.
