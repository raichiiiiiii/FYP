# UI Route Health Audit

Date: 2026-06-07
Workspace: `C:\Users\User\dev\FYP`
Repository: `raichiiiiiii/FYP`
Status: Route-health regression passed on 2026-06-07; product code was not changed by this evidence slice.

## Scope

This document is the route-health baseline for the critical UI routes requested in the Agent Route Baseline task. It records the audit structure, regression guard, and latest local Playwright run result. Passing route-health means these routes did not render fatal runtime/server error text during the scripted run; it is not a human HCI score.

Critical routes:

- `/dashboard`
- `/finance/opportunities`
- `/finance/applications`
- `/finance/contracts`
- `/graph/projects`
- `/operations`

## Source Of Truth Notes

- SRS: MEPN is a self-hosted procurement and restricted mudarabah-finance node with role-based access, dashboard/procurement/finance summaries, graph/canvas visibility, audit evidence, Fabric proof separation, and operations visibility.
- SDD: the web app covers protected routes for procurement, finance, canvas, audit/evidence, reports, and operations; authorization, truthful Fabric states, observability, and secret-safe evidence are explicit design responsibilities.
- UI contract: protected routes require valid session, organization context, role/permission checks, loading/empty/error/permission-denied states, and backend enforcement independent of frontend hiding.
- UI contract route map: `/dashboard`, `/graph/projects`, `/finance/opportunities`, `/finance/applications`, `/finance/contracts`, and operations health surfaces are part of the implementation route inventory.
- Figma Make reference files are visual/interaction references only: `DashboardView.tsx`, `OpportunitiesView.tsx`, `ApplicationsList.tsx`, `ApplicationWorkspace.tsx`, `LedgerView.tsx`, `NetworkCanvas.tsx`, and `OperationsView.tsx`.

## Helper Discovery

Existing Playwright helpers were found in `tests/e2e/helpers.ts`:

- `resetDatabase()`
- `createOrganizationViaApi()`
- `setSession()`

The route-health spec therefore uses helper-based dev-session setup. There is no current blocker requiring a placeholder login flow.

## Regression Spec Baseline

Spec file: `tests/e2e/00-route-health.spec.ts`

The spec:

- resets the E2E database before each route;
- creates an organization through the API;
- injects an authenticated dev session with the existing `setSession` helper;
- opens each critical route through the production router;
- records sanitized console warnings/errors, page errors, failed requests, and HTTP 5xx responses;
- fails if rendered route text contains `Internal Server Error`, `Application Error`, `Unhandled Runtime Error`, `500`, or stack-trace text;
- fails conservatively on blank body, document HTTP 5xx, page errors, failed requests, or HTTP 5xx responses;
- writes a screenshot only when the route is unhealthy.

Failure screenshots are intentionally not pre-created. If a route fails, Playwright writes the screenshot under `docs/evidence/ux/screenshots/route-health/`.

## Route Matrix

| Route | Screenshot path | Console errors | Network failures | API status | Suspected cause | Before status | After status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/dashboard` | `docs/evidence/ux/screenshots/route-health/dashboard-failure.png` | No failing diagnostic in latest run | No failing diagnostic in latest run | Document response below 500 | No current route-health failure | Not reproduced | Passed |
| `/finance/opportunities` | `docs/evidence/ux/screenshots/route-health/finance-opportunities-failure.png` | No failing diagnostic in latest run | No failing diagnostic in latest run | Document response below 500 | No current route-health failure | Not reproduced | Passed |
| `/finance/applications` | `docs/evidence/ux/screenshots/route-health/finance-applications-failure.png` | No failing diagnostic in latest run | No failing diagnostic in latest run | Document response below 500 | No current route-health failure | Not reproduced | Passed |
| `/finance/contracts` | `docs/evidence/ux/screenshots/route-health/finance-contracts-failure.png` | No failing diagnostic in latest run | No failing diagnostic in latest run | Document response below 500 | No current route-health failure | Not reproduced | Passed |
| `/graph/projects` | `docs/evidence/ux/screenshots/route-health/graph-projects-failure.png` | No failing diagnostic in latest run | No failing diagnostic in latest run | Document response below 500 | No current route-health failure | Not reproduced | Passed |
| `/operations` | `docs/evidence/ux/screenshots/route-health/operations-failure.png` | No failing diagnostic in latest run | No failing diagnostic in latest run | Document response below 500 | No current route-health failure | Not reproduced | Passed |

## Screenshot Truthfulness

No route-health failure screenshots were generated in the latest passing run. Existing repository screenshots under `docs/evidence/ux/screenshots/after-*.png` remain route-recovery artifacts from prior work, while HCI screenshots were refreshed by the HCI screenshot capture spec.

## Validation Command

Preferred full route-health run:

```powershell
corepack pnpm test:e2e -- tests/e2e/00-route-health.spec.ts
```

Lightweight syntax/list check:

```powershell
corepack pnpm exec playwright test tests/e2e/00-route-health.spec.ts --list
```

Current validation in this pass:

- `corepack pnpm exec playwright test tests/e2e/00-route-health.spec.ts --list` passed and listed all six route-health tests.
- `corepack pnpm test:e2e -- tests/e2e/00-route-health.spec.ts` passed on 2026-06-07; 6 checks passed.

## Blockers

- None for helper discovery.
- No current route-health blocker from the latest local run.
- Failure screenshots are generated only when a route fails the health criteria.
