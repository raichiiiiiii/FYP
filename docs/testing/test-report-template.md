# MEPN Test Report

## Build Information

- Branch: `main`
- Commit: `a159c5d test: align demo data and UAT flow for UI UX review`
- Short commit: `a159c5d`
- Date: `2026-06-04 08:19 +09:00`
- Tester: Codex local verification
- Command: `corepack pnpm lint`, `corepack pnpm typecheck`, `corepack pnpm test`, `corepack pnpm build`, and `corepack pnpm test:e2e`

## Static Checks

| Check | Command | Result | Notes |
|---|---|---|---|
| Lint | `corepack pnpm lint` | Pass | API, worker, web, shared, and config workspace checks passed. |
| Typecheck | `corepack pnpm typecheck` | Pass | Frontend TypeScript project build passed. |
| Format | `corepack pnpm format:check` | Not configured | Root package does not currently define `format:check`. |
| Build | `corepack pnpm build` | Pass | Web, API, and worker builds passed. |

## Unit And Component Tests

| Area | Result | Notes |
|---|---|---|
| API unit tests | Pass | 10 suites, 35 tests passed. |
| Worker unit tests | Pass | 2 suites, 2 tests passed. |
| Web tests | Pass | 17 test files, 85 tests passed. |
| RBAC and route visibility | Pass | Covered by frontend authorization/navigation tests. |
| Dashboard | Pass | Role-aware dashboard model tests passed. |
| Applications/workspace | Pass | Application list/workspace frontend tests passed in web suite. |
| Ledger calculation | Pass | Ledger/profit-loss frontend domain tests passed in web suite. |
| Audit/Fabric status | Pass | Anchor status display tests passed in web suite. |
| Packages | Pass | `@mepn/config` and `@mepn/shared` currently report no dedicated tests configured. |

## End-To-End Tests

| Flow | Result | Notes |
|---|---|---|
| SME admin dashboard | Pass | `SRS-HEALTH-001`, `SRS-ID-001`, and dashboard/auth setup passed under Playwright. |
| Procurement flow | Pass | Source-to-pay E2E passed, including requisition, approval, RFQ, quotation, PO, receipt, invoice, and audit checks. |
| Mudarabah application flow | Pass | Opportunity creation, draft application submission, evidence checklist, due diligence, Shariah review, and approval passed. |
| Shariah review flow | Pass | Role-scoped workspace tabs/actions passed for procurement officer, Shariah reviewer, and auditor. |
| Audit verification flow | Pass | Evidence pack export, hash verification, mock Fabric anchor visibility, entity timeline, and audit search passed. |
| Closure/profit-loss flow | Pass | Contract, mock e-signature request, ledger entry, P/L statement, and closure export passed with application status reaching `CLOSED`. |
| Graph and integrations | Pass | Project graph role filtering and integrations/outbox status flow passed. |
| Phase 12 demo/UAT alignment | Pass | UAT seed syntax check passed with `node --check tests/uat/seed-uat-demo.mjs`; docs now distinguish API-backed seed data, frontend fixtures, mock adapters, and unavailable features. |

## Deployment Smoke Tests

| Check | Result | Notes |
|---|---|---|
| Compose config | Pass | `docker compose -f docker-compose.prod.yml --env-file .env.production.example config` passed locally. |
| Docker Compose build | Blocked locally | Docker Desktop daemon became unresponsive during local build attempt. Needs retry after Docker daemon restart. |
| App loads on Azure VM | Not run | VM host/key details were not available to Codex. |
| Health endpoint on Azure VM | Not run | Run after manual cloud deployment. |
| Containers running on Azure VM | Not run | Run `docker compose -f docker-compose.prod.yml --env-file .env.production ps` on the VM. |
| Logs clean on Azure VM | Not run | Run `docker compose -f docker-compose.prod.yml --env-file .env.production logs --tail=100` on the VM. |

## Known Issues And Risks

- `format:check` is documented in the testing strategy but is not currently a
  root package script.
- `corepack pnpm verify` does not include Playwright E2E by design; run
  `corepack pnpm test:e2e` separately for the browser workflow gate.
- Playwright web server output includes a non-failing PostgreSQL client
  deprecation warning from the API runtime.
- Vite build reports a non-failing large bundle chunk warning for the web app.
- Local Docker Compose production build needs to be retried after Docker daemon
  responsiveness is restored.
- Azure Student VM manual deployment has not been recorded with live smoke-test
  output in this repository.
- Some product surfaces still use fixtures, local/dev auth, mock adapter states,
  disabled report exports, or incomplete backend contracts.

## Sign-Off

- Developer: Pending
- Reviewer: Pending
- Date: Pending
