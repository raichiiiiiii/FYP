# MEPN Feature Status and Future Implementation Plan

## Purpose

This document is the consolidated feature inventory for future implementation
work. It groups the product into:

- implemented features
- partially implemented features
- soon-to-be implemented features
- proposed delighter features

Use this file before starting new implementation slices so agents can understand
what already exists, what is blocked, and what should not be overstated during
demo or review.

## Related Documents

| Document | Purpose |
|---|---|
| `docs/implementation-plan.md` | Original phase-by-phase implementation roadmap. |
| `docs/phase-0-to-23-todo.md` | Historical phase tracker and blocker-oriented TODO list. |
| `docs/roadmap/fabric-graph-implementation-todo.md` | Fabric, graph, integration, Gateway, and deployment implementation status. |
| `docs/roadmap/product-hardening-backlog.md` | Post-demo production-hardening backlog. |
| `docs/ui/ui-ux-close-alignment-blockers-todo.md` | UI/UX blocker tracker. |
| `docs/testing/testing-strategy.md` | Required verification strategy. |
| `docs/demo-script.md` | Demo path and reviewer-facing product flow. |

## Current Demo Boundary

MEPN is currently suitable for FYP/demo review and local or Azure Student VM
validation.

It is not yet suitable for regulated production financial use.

Important constraints:

- Dev login is available for demo/UAT only when explicitly enabled; production OIDC/invitation auth is not complete.
- Mock integration paths remain available for deterministic tests.
- Real Fabric verification requires Gateway mode plus a successful chaincode `ReadAnchor`.
- `verified=true` must never be shown from stored metadata alone.
- Ledger/P&L must never calculate or imply guaranteed fixed return.
- Figma Make remains visual/interaction reference only.

## Repository State Reconciliation

Last reconciled: 2026-06-06.

This section classifies each soon-to-be feature against the current repository
state. The classifications are intentionally conservative:

- `evidence-only`: implementation scaffolding exists; remaining work is to run
  an environment or UAT evidence capture.
- `implementation-required`: production code, API, workflow, or UI work remains.
- `environment-blocked`: work depends on VM, Fabric Gateway, provider, or other
  runtime material outside the repository.
- `partially scaffolded`: schema, UI, tests, or docs exist, but the feature is
  not complete end-to-end.

| Feature | Classification | Current repository state | Required next action |
|---|---|---|---|
| Run Azure VM Fabric Gateway deployment | evidence-only; implemented with evidence | GitHub Actions deployment run `27043095990` completed successfully against the Azure Student VM. Sanitized evidence records Docker Compose service health, public frontend/API health checks, and Gateway mode configured with no missing Gateway config. | No deployment-health action remains for this feature. Continue with the separate real Fabric proof screenshot item, which still requires a live Gateway-anchored hash record id. |
| Generate real Fabric proof screenshots | implemented with VM-local FYP/UAT evidence | API-side `ReadAnchor` verification, web proof panel, gated Playwright screenshot flow, VM-local Fabric runtime, and reviewer screenshots now exist. Hash record `34c5a7e7-5bf3-4246-89ae-b51a2e765ef4` returned `verified=true` from chaincode `ReadAnchor` on the Azure VM-local Fabric network. | Keep evidence in `docs/evidence/qa/FABRIC_GATEWAY_UAT_EVIDENCE.md`; production consortium hardening remains separate from this FYP/UAT proof. |
| Production OIDC/invitation flow | implementation-required; partially scaffolded | Runtime auth is still dev-login oriented unless `DEV_AUTH_ENABLED` is set for local/UAT. Backend OIDC start/callback endpoints, state/nonce validation, claim validation, and test-provider login exist. Prisma has a token-hash `Invitation` model and backend invitation lifecycle API; invite/OIDC frontend flow and real-provider token exchange remain incomplete. | Add frontend login mode handling, invite acceptance UI, real-provider adapter configuration if required, and UAT evidence. |
| Report aggregate DTOs and exports | implementation-required | Reports currently exist as frontend demo/report surfaces. No backend `reports` module, aggregate report endpoints, export job model, audited export lifecycle, or download route exists. | Add backend report DTOs, export job persistence, JSON export/download, frontend export flow, and evidence docs. |
| Loss exception workflow | implementation-required; partially scaffolded | Prisma has a basic `LossException` model and finance service can include/display loss exceptions, but there is no complete classification workflow, reviewer decision lifecycle, evidence attachment flow, API controller, or closure gate for unresolved exceptions. | Define the domain contract, extend schema/service/API, enforce closure gate, add UI/UAT flow, and prove no guaranteed fixed return. |
| Accessibility automation | implementation-required | Manual UI improvements and testing strategy docs exist, but no automated axe/contrast/focus accessibility test suite or CI evidence is present. | Add accessibility test helper, critical-route specs, fix high-priority findings, and record evidence. |
| Backup/restore proof | implementation-required | Deployment docs mention limitations, but there are no repeatable backup, restore, or restore-smoke scripts. | Add PostgreSQL/object-storage backup and restore scripts, smoke checks, runbook, and evidence template. |
| Richer dashboard/procurement/finance summaries | implementation-required; partially scaffolded | Dashboard has a backend summary endpoint, but procurement and finance summary DTOs are not complete. Current dashboard task grouping is basic and does not cover all review queues, workflow blockers, exceptions, or readiness states. | Define summary DTO contracts, extend dashboard summary, add procurement and finance summary endpoints, replace remaining production aggregations, and test role filtering. |
| Graph saved views and risk scoring | implementation-required; partially scaffolded | Read-only graph with hash/anchor overlay, filters, role filtering, and E2E coverage exists. Backend-owned risk metadata, query-param filters, persisted saved views, and saved layout state are not implemented. | Define risk contract, add backend risk metadata, implement query-param filters, add saved views if feasible, and prove no role leakage. |

## Implemented Features

| Area | Implemented feature | Evidence / primary files |
|---|---|---|
| App shell | Production routing, protected routes, RBAC navigation, app shell, page framing, permission-denied states. | `apps/web/src/app/`, `apps/web/src/layouts/`, `apps/web/src/app/authorization.ts` |
| Authentication demo path | Local/dev login using email and organization ID for repeatable demo/UAT access. | `apps/web/src/features/auth/`, `tests/e2e/09-auth-flow.spec.ts` |
| Dashboard | Role-aware dashboard with API-backed summary endpoint and production route data loading. | `apps/api/src/modules/dashboard/`, `apps/web/src/features/dashboard/` |
| Procurement | Requisition, approval, source-to-pay path, purchase order, invoice/matching views, and procurement E2E coverage. | `apps/api/src/modules/procurement/`, `apps/web/src/features/procurement/`, `tests/e2e/04-procurement-flow.spec.ts` |
| Finance opportunities | Revenue-generating opportunity flow with backend eligibility guard. | `apps/api/src/modules/finance/finance.service.ts`, `apps/web/src/features/finance/` |
| Mudarabah applications | Application list, status visibility, workspace navigation, evidence/review/approval gates. | `apps/web/src/features/finance/`, `tests/e2e/06-mudarabah-application-flow.spec.ts` |
| Application workspace | Lifecycle visibility, evidence progress, due diligence, Shariah review, contract/disbursement/closure guardrails. | `apps/web/src/features/finance/`, `apps/api/src/modules/finance/` |
| Ledger and P/L | Ledger and profit/loss display with no-guaranteed-fixed-return safeguards. | `apps/web/src/features/finance/`, `tests/e2e/07-closure-pack-flow.spec.ts` |
| Audit and evidence | Audit timeline, hash records, canonical hash explanation, evidence/audit workflow. | `apps/api/src/modules/evidence/`, `apps/api/src/modules/audit/`, `docs/evidence/canonical-hash-verification.md` |
| Fabric worker adapter | Real Fabric Gateway worker adapter with mock/gateway mode separation and hash-only payload submission. | `apps/worker/src/integrations/`, `apps/worker/test/` |
| Fabric API verification | API-side Fabric `ReadAnchor` verification endpoint for hash records. | `apps/api/src/modules/evidence/hash-records/` |
| Real Fabric Gateway UAT proof | VM-local Fabric runtime proof with worker-submitted transaction, API-side `ReadAnchor` verification, transaction metadata, and reviewer-facing screenshots. | `docs/evidence/qa/FABRIC_GATEWAY_UAT_EVIDENCE.md`, `docs/evidence/uat/fabric-gateway-hash-record-verification.png`, `docs/evidence/uat/fabric-gateway-proof-panel.png` |
| Fabric chaincode/local network | Audit anchor chaincode, local Fabric test network scripts, Gateway env export helper. | `chaincode/audit-anchor-go/`, `infra/fabric/` |
| Graph/canvas | Read-only project graph with role-filtered procurement, finance, hash-record, and anchor overlay nodes. | `apps/api/src/modules/graph/`, `apps/web/src/features/graph/` |
| Integrations | Integration status cards, Fabric runtime mode display, outbox visibility, retry/degraded/unavailable states. | `apps/api/src/modules/integrations/`, `apps/web/src/features/integrations/` |
| Operations | Worker heartbeat model/API/UI for queue and worker liveness visibility. | `apps/api/prisma/schema.prisma`, `apps/api/src/modules/integrations/`, `apps/web/src/features/operations/` |
| Admin and identity | Organization setup, role/user membership management, admin demo surfaces. | `apps/api/src/organizations/`, `apps/api/src/users/`, `apps/web/src/features/identity/` |
| Reports demo surface | Reports landing/demo cards with honest partial/export limitations. | `apps/web/src/features/reports/` |
| CI | GitHub Actions CI for install, lint, typecheck, tests, and build. | `.github/workflows/ci.yml` |
| Deployment | Docker Compose production setup and Azure Student VM deployment documentation. | `docker-compose.prod.yml`, `deploy/`, `docs/deployment/azure-student-vm-deployment.md` |
| Fabric secret delivery | GitHub Actions VM secret materialization, validation, smoke, and evidence scripts. | `.github/workflows/deploy-azure-vm.yml`, `scripts/deploy/`, `scripts/validate-fabric-secrets.sh` |
| Azure VM Gateway deployment evidence | GitHub Actions deployment to the Azure Student VM passed with sanitized service-health and Fabric Gateway configuration evidence. | `docs/evidence/deployment/VM_DEPLOYMENT_EVIDENCE.md`, `docs/evidence/deployment/latest-vm-deployment-evidence.txt` |
| Testing | Unit/component/API tests and Playwright E2E suite covering critical demo flows. | `tests/e2e/`, `apps/*/test/` |
| Documentation | ADRs, UI contract docs, Figma reference docs, demo script, UAT/testing strategy, roadmap trackers. | `docs/` |

## Partially Implemented Features

| Area | Current state | What remains |
|---|---|---|
| Formal UAT execution | UAT checklist/templates exist. | Reviewer-led execution and signed evidence package remain pending. |
| Reports | Demo reports exist. | Backend aggregate DTOs, audited export jobs, generated files, and download routes remain incomplete. |
| Production authentication | Dev login works for local/UAT and is guarded by `DEV_AUTH_ENABLED`; production defaults disable dev login. | Real OIDC, invite-token validation, expiry/revocation, MFA/password policy decisions remain incomplete. |
| Loss exception workflow | Loss exception status can be displayed. | Full genuine loss vs breach/negligence/fraud classification workflow remains incomplete. |
| Accessibility | Manual/shared UI improvements exist. | Automated axe/contrast/focus regression tests remain incomplete. |
| Backup/restore | Deployment docs note limitations. | Repeatable backup/restore scripts and restore proof are not complete. |
| Dashboard task depth | Dashboard is API-backed. | Richer role-specific queues, evidence gaps, and operational task grouping remain partial. |
| Procurement analytics | Core procurement path works. | Supplier scoring, richer matching exception workflow, and sourcing analytics remain incomplete. |
| Graph advanced behavior | Role-filtered read-only graph works. | Saved layouts, annotations, persisted filters, and backend-owned risk scoring remain incomplete. |
| External integrations | Mock/outbox integration boundary exists. | Real ERP, e-signature, payment/finance provider, and external Fabric provider probes remain incomplete. |

## Soon-To-Be Implemented Features

These are the next practical implementation slices.

| Priority | Feature | Implementation notes | Acceptance evidence |
|---|---|---|---|
| P1 | Production OIDC/invitation flow | Disable dev login by default in production, add OIDC callback and invite validation. | Auth E2E, audit events, UAT login screenshots. |
| P1 | Report aggregate DTOs and exports | Add procurement, finance, audit, and integration report DTOs plus export jobs. | API tests, downloadable report artifacts, audit events. |
| P1 | Loss exception workflow | Add reviewer classification endpoints and UI for genuine loss vs breach/negligence/fraud. | Workflow tests and UAT scenario. |
| P2 | Accessibility automation | Add Playwright axe or equivalent checks for demo-critical routes. | CI accessibility report. |
| P2 | Backup/restore proof | Add database/object-storage backup and restore scripts. | Restore run log and smoke-test evidence. |
| P2 | Richer dashboard/procurement/finance summaries | Add backend-owned summary DTOs for queues, blockers, exceptions, and review readiness. | API tests and UI rendering tests. |
| P3 | Graph saved views and risk scoring | Add backend-owned risk metadata, query-param filters, and optional saved views. | Graph API tests and E2E role-filtering tests. |

## Phased Implementation Plan For Soon-To-Be Features

Each slice must be small enough to commit independently. If a blocker is hit,
create a blocker note under `docs/evidence/blockers/`, commit only safe passing
work, and resume from the blocked slice after the external condition is fixed.

### Phase 1 - P0 Azure VM Fabric Gateway Deployment Evidence

| Slice | Purpose | Files likely touched | Implementation task | Tests | Acceptance / evidence | Commit checkpoint | Blocker / resume |
|---|---|---|---|---|---|---|---|
| 1.1 Deployment workflow and secret mapping audit | Confirm existing deploy path consumes only configured secrets safely. | `.github/workflows/deploy-azure-vm.yml`, `scripts/deploy/`, `scripts/smoke/`, `docker-compose.prod.yml`, `.env.production.example`, `docs/deployment/` | Check exact secret names, no `set -x`, no PEM printing, `/run/secrets/fabric` layout, and read-only mounts; patch gaps only. | `bash -n` for deploy/smoke scripts; `corepack pnpm lint`; `corepack pnpm typecheck`; targeted config tests if changed. | Secret contract matches repository secrets and docs; no normal workflow output can reveal PEM/private key material. | `chore(deploy): verify fabric gateway secret mapping` | Block if workflow requires unavailable secrets or deploy path cannot be made secret-safe; resume after secret/runtime decision. |
| 1.2 Fabric secret validation hardening | Prove mounted Fabric material can be validated without exposing contents. | `scripts/validate-fabric-secrets.sh`, optional shell-test fixtures, `docs/deployment/` | Validate cert/key/TLS/profile/env presence, JSON parsing, required env keys, file sizes/status, and private-key permissions where supported. | `bash -n scripts/validate-fabric-secrets.sh`; placeholder valid layout; missing-file negative layout. | Valid placeholder passes; missing cert/key/profile/env fails clearly; output is safe for evidence docs. | `chore(deploy): harden fabric secret validation` | Block if local shell cannot run script; resume after shell/WSL/Bash availability is fixed. |
| 1.3 VM evidence collection hardening | Make VM smoke/evidence output reviewer-safe. | `scripts/evidence/collect-vm-deployment-evidence.sh`, `docs/evidence/deployment/VM_DEPLOYMENT_EVIDENCE.md` | Collect timestamp, branch, commit, compose ps/logs, health, readiness, Fabric status, optional hash verification; redact secrets and continue non-critical checks. | `bash -n`; dry run where feasible; targeted smoke against local app if running. | Evidence output contains diagnostics but no PEM, tokens, passwords, env files, or connection strings. | `chore(evidence): sanitize vm deployment evidence collection` | Block if script cannot safely redact expected output; resume after redaction helper is corrected. |
| 1.4 Deployment execution/evidence | Produce real Azure VM deployment evidence or a blocker note. | `docs/evidence/deployment/`, `docs/evidence/blockers/`, roadmap docs | Trigger deployment workflow or document exact manual trigger steps; collect sanitized run status and smoke output. | `APP_BASE_URL=... bash scripts/smoke/fabric-gateway-smoke.sh`; public health checks if VM reachable. | VM deployment evidence exists, or a blocker note states VM/SSH/Fabric failure and resume steps. | `chore(deploy): record azure vm fabric deployment evidence` | Block on VM unreachable, SSH failure, invalid secrets, Docker failure, or Fabric unavailable; resume by rerunning workflow and smoke script. |
| 1.5 Roadmap status update | Keep P0 deployment status honest. | `docs/roadmap/feature-status-and-future-implementation.md`, `docs/roadmap/fabric-graph-implementation-todo.md` | Move deployment feature to Implemented only with live evidence; otherwise Partial with blocker link. | `corepack pnpm lint`; `corepack pnpm typecheck`. | Roadmap points to evidence or blocker and does not overclaim production readiness. | `docs(roadmap): update azure vm deployment status` | Block only if evidence status is unknown; resume after evidence/blocker file exists. |

### Phase 2 - P0 Real Fabric Proof Screenshots

| Slice | Purpose | Files likely touched | Implementation task | Tests | Acceptance / evidence | Commit checkpoint | Blocker / resume |
|---|---|---|---|---|---|---|---|
| 2.1 Verification API/UI readiness | Ensure proof UI can consume real chaincode verification truthfully. | `apps/api/src/modules/evidence/hash-records/`, `apps/web/src/features/evidence/`, `tests/e2e/15-fabric-gateway-uat-proof.spec.ts` | Confirm endpoint, DTO mapping, loading/error states, Gateway metadata, mismatch/unavailable states, and absence of mock labels in Gateway mode. | API unit/integration tests for verified/mismatch/unavailable/not found/unauthorized; frontend state tests; build. | `verified=true` remains impossible without successful `ReadAnchor`; UI is ready for screenshots. | `test(fabric): verify gateway proof api and ui readiness` | Block if endpoint cannot query Gateway safely; resume after API verification is fixed. |
| 2.2 Live Gateway hash precondition | Create or identify a real Gateway-anchored hash record. | `docs/evidence/qa/FABRIC_GATEWAY_UAT_EVIDENCE.md`, optional blocker note | Use local Fabric or Azure VM Gateway mode; confirm `AuditAnchor`, transaction metadata, `ReadAnchor`, and API `verified=true`. | Live `curl /api/v1/hash-records/:id/fabric-verification` or equivalent targeted integration command. | Live hash record id, organization id, and user id are known without exposing secrets. | `docs(evidence): record live fabric uat hash record precondition` | Block if no live Gateway anchor exists or `ReadAnchor` fails; resume after anchoring succeeds. |
| 2.3 Gated screenshot flow | Capture reviewer-facing real Gateway proof screenshots. | `tests/e2e/15-fabric-gateway-uat-proof.spec.ts`, `docs/evidence/uat/` | Run gated Playwright spec with live hash env; verify Gateway mode, transaction metadata, on-chain verified state, no mock labels. | `corepack pnpm test:e2e -- tests/e2e/15-fabric-gateway-uat-proof.spec.ts`. | `fabric-gateway-hash-record-verification.png` and `fabric-gateway-proof-panel.png` exist and show real proof. | `test(uat): capture real fabric gateway proof screenshots` | Block if spec skips, panel says mismatch/unavailable, or screenshot includes mock labels; resume after live data/API issue is fixed. |
| 2.4 UAT evidence package | Convert screenshot run into reviewer evidence. | `docs/evidence/qa/FABRIC_GATEWAY_UAT_EVIDENCE.md` | Record date, commit SHA, environment, channel, chaincode, MSP ID, commands, screenshot links, verification result, and limitations. | `corepack pnpm lint`; `corepack pnpm typecheck`. | Evidence doc is filled without secrets or PEM material. | `docs(evidence): update fabric gateway uat proof package` | Block if screenshot evidence is missing; resume after Slice 2.3 passes. |
| 2.5 Roadmap status update | Move real proof screenshots to Implemented or Partial. | Roadmap docs | Update status and link evidence/blocker. | `corepack pnpm lint`; `corepack pnpm typecheck`. | Roadmap matches actual screenshot state. | `docs(roadmap): update real fabric proof screenshot status` | Block only if evidence status is ambiguous. |

### Phase 3 - P1 Production OIDC / Invitation Flow

| Slice | Purpose | Files likely touched | Implementation task | Tests | Acceptance / evidence | Commit checkpoint | Blocker / resume |
|---|---|---|---|---|---|---|---|
| 3.1 Auth config and dev-login guard | Prevent demo login from being production default. | `apps/api/src/modules/auth/`, config files, `.env.production.example`, auth tests, login UI if needed | Add `DEV_AUTH_ENABLED`, OIDC config parsing, production default deny for dev login, clear error when disabled. | Unit/config tests; API integration tests; `tests/e2e/09-auth-flow.spec.ts` in dev-enabled mode. | Dev login works only when explicitly enabled; production-like mode rejects it. | `feat(auth): guard dev login behind environment config` | Block if current tests depend on unconfigurable dev auth; resume after test env config is added. |
| 3.2 Invitation schema hardening | Stop storing raw invitation tokens and support lifecycle states. | `apps/api/prisma/schema.prisma`, migrations, auth/identity services | Add token hash, expiry/revocation/acceptance fields, migration, UAT seed updates if needed. | Prisma generate; unit tests for token hashing/expiry/status; migration/integration test. | Raw token is never stored; model supports pending/accepted/revoked/expired. | `feat(auth): add invitation persistence model` | Block on migration conflict; resume after schema reconciliation. |
| 3.3 Invitation API | Backend-owned invitation lifecycle. | `apps/api/src/modules/auth/`, identity/rbac/audit modules, tests | Add create/list/revoke/accept endpoints, permission checks, membership creation, audit events. | Unit tests for validation/role mapping; integration tests for admin/non-admin/expired/revoked/accepted flows. | Invitation lifecycle is API-backed, permissioned, and audited. | `feat(auth): add invitation lifecycle api` | Block on unclear invite policy/role matrix; resume after product decision. |
| 3.4 OIDC adapter/callback | Add production login path without requiring a real provider in CI. | `apps/api/src/modules/auth/oidc.strategy.ts`, auth controller/service/tests | Add OIDC start/callback, state/nonce, mocked verifier for tests, claim mapping to user/membership or invite. | Unit tests for config/claims/state; integration tests for valid/invalid mocked tokens. | OIDC path is testable, invalid claims fail, production config can point to real provider. | `feat(auth): add oidc login callback flow` | Block on provider-specific claim policy if real provider behavior is required; resume with provider config. |
| 3.5 Frontend login/invite UI | Make auth modes clear to users. | `apps/web/src/features/auth/`, routes, shared API/tests, E2E auth spec | Show dev login only when enabled; show OIDC action when enabled; add invite acceptance page states. | UI tests; auth E2E; build. | Production-like UI hides dev login; invite acceptance states are visible and tested. | `feat(auth): add production login and invite acceptance ui` | Block if backend auth mode endpoint is missing; resume after API mode endpoint exists. |
| 3.6 Auth docs/UAT | Record auth boundary and evidence. | docs/evidence/auth, roadmap, demo/UAT docs | Document dev auth, OIDC test adapter, invite flow, screenshots, and remaining provider limitations. | `lint`; `typecheck`; targeted auth E2E. | Auth status is honest and evidence-backed. | `docs(auth): document oidc invitation uat evidence` | Block if UAT screenshots cannot be captured; resume after UI flow passes. |

### Phase 4 - P1 Report Aggregate DTOs And Exports

| Slice | Purpose | Files likely touched | Implementation task | Tests | Acceptance / evidence | Commit checkpoint | Blocker / resume |
|---|---|---|---|---|---|---|---|
| 4.1 Report API DTOs | Backend-owned report data contracts. | `apps/api/src/modules/reports/`, app module, tests | Add summary/procurement/finance/audit/integration report DTOs and GET endpoints with org/role filtering. | Unit DTO tests; integration endpoint tests. | Reports API exists and restricted data is filtered server-side. | `feat(reports): add aggregate report dtos` | Block on unclear report scope; resume after report fields are finalized. |
| 4.2 Export job model | Persist report export lifecycle. | Prisma schema/migrations, reports service/tests | Add export job model/statuses and format validation. | Prisma generate; unit transition tests; integration persistence test. | Export jobs have explicit queued/processing/completed/failed/expired lifecycle. | `feat(reports): add report export job model` | Block on migration conflict; resume after schema fix. |
| 4.3 JSON export/download | First audited export path. | Reports controllers/services, storage/object helpers, audit/outbox modules | Add request/status/download endpoints, JSON artifact generation, audit events, optional outbox. | Unit artifact/audit tests; integration request/poll/download/unauthorized tests. | User can request and download JSON report; no secrets in artifact. | `feat(reports): add audited json report exports` | Block if storage decision is missing; resume with local safe export directory or object storage decision. |
| 4.4 Reports frontend | Replace demo-only report surface with backend DTO/export flow. | `apps/web/src/features/reports/`, API client, tests, E2E | Load report DTOs, enable JSON export, add loading/error/empty/unauthorized/export states. | UI tests; reports E2E; build. | Production reports page uses backend DTOs and supports JSON export. | `feat(reports): connect reports ui to export api` | Block if API export is incomplete; resume after Slice 4.3. |
| 4.5 Reports docs/evidence | Make report capability reviewable. | Roadmap, UI/API docs, evidence docs | Document endpoints, sample sanitized JSON, screenshots, unsupported formats. | `lint`; `typecheck`. | Reports are marked Implemented/Partial honestly with evidence links. | `docs(reports): document report dto export evidence` | Block if export evidence missing; resume after E2E/export run. |

### Phase 5 - P1 Loss Exception Workflow

| Slice | Purpose | Files likely touched | Implementation task | Tests | Acceptance / evidence | Commit checkpoint | Blocker / resume |
|---|---|---|---|---|---|---|---|
| 5.1 Domain contract | Define Shariah/business workflow before code. | `docs/finance/` or roadmap docs | Document genuine loss, breach, negligence, misconduct, fraud, insufficient evidence, closure rules, permissions, and no fixed return. | `lint`; `typecheck`. | Domain contract is explicit and avoids fixed-return language. | `docs(finance): define loss exception workflow contract` | Block on Shariah/product decision; resume after policy is clarified. |
| 5.2 Domain model/service | Persist and validate loss exception lifecycle. | Prisma schema/migrations, finance service/tests | Extend model with classification/decision/evidence fields and service transitions. | Prisma generate; unit transition/evidence tests; integration persistence tests. | Exceptions can be transitioned only through valid states. | `feat(finance): add loss exception domain model` | Block on schema conflict or unresolved classification policy. |
| 5.3 API/permissions | Expose reviewer workflow through backend. | Finance controllers/services, rbac, audit/outbox tests | Add list/read/create/evidence/decision/close endpoints with permissions, org scope, audit/outbox. | Unit permission/audit tests; integration unauthorized/authorized lifecycle tests. | Loss exception lifecycle is API-backed and audited. | `feat(finance): add loss exception api` | Block if reviewer role matrix is unclear; resume after role decision. |
| 5.4 Closure gate | Make backend source of truth for closure blocking. | Finance closure/profit-loss services/tests | Block closure/export while unresolved exception exists; allow after valid resolution; structured 4xx errors. | Unit guard tests; integration direct API bypass tests. | UI cannot bypass closure gate; no fixed return generated. | `feat(finance): enforce loss exception closure gate` | Block if existing closure state model conflicts; resume after migration/contract fix. |
| 5.5 Loss exception UI/UAT | Give reviewers a usable classification flow. | Finance workspace/closure UI, API client, tests, E2E | Add panel/form, evidence selection, blocked closure message, domain-safe copy. | UI tests; loss exception E2E/UAT. | Reviewer can classify exception; closure blocked until resolved. | `feat(finance): add loss exception review ui` | Block if backend API is incomplete; resume after Slice 5.4. |
| 5.6 Docs/evidence | Record workflow and limitations. | Roadmap, evidence, demo/UAT docs | Add evidence screenshots, command results, Shariah/legal copy caveats. | `lint`; `typecheck`. | Loss exception status is accurate and evidence-linked. | `docs(finance): record loss exception workflow evidence` | Block if UAT not run; resume after E2E. |

### Phase 6 - P2 Accessibility Automation

| Slice | Purpose | Files likely touched | Implementation task | Tests | Acceptance / evidence | Commit checkpoint | Blocker / resume |
|---|---|---|---|---|---|---|---|
| 6.1 Tooling setup | Add automated accessibility checks. | `package.json`, lockfile, `tests/e2e/accessibility.helpers.ts`, first spec | Add compatible axe/helper, actionable reporting, narrow exception mechanism. | Install; smoke accessibility spec; build. | Tooling runs without broad ignores. | `test(a11y): add accessibility test helper` | Block on dependency conflict; resume after compatible tool choice. |
| 6.2 Critical route specs | Cover demo-critical pages. | `tests/e2e/*accessibility*.spec.ts` | Add login/dashboard/procurement/finance/audit/graph/reports/admin accessibility checks. | Targeted accessibility E2E. | Critical routes have automated coverage. | `test(a11y): cover demo critical routes` | Block on unstable test setup; resume after seeded route helper fix. |
| 6.3 Fix findings | Resolve high-priority violations. | Shared components, layouts, feature UI, tests | Fix labels, headings, button names, focus, dialog semantics, contrast where practical. | Unit/UI tests; accessibility E2E; build. | Accessibility spec passes without breaking flows. | `fix(a11y): resolve critical route accessibility issues` | Block on design/product decision for major layout changes. |
| 6.4 CI/evidence | Make automation discoverable. | CI/workflow if acceptable, `docs/evidence/qa/ACCESSIBILITY_EVIDENCE.md`, testing docs | Add script/CI docs and evidence result. | `lint`; `typecheck`; accessibility E2E. | Accessibility automation is documented and reproducible. | `docs(a11y): document accessibility automation evidence` | Block if CI runtime is too slow/flaky; resume with documented manual command. |

### Phase 7 - P2 Backup / Restore Proof

| Slice | Purpose | Files likely touched | Implementation task | Tests | Acceptance / evidence | Commit checkpoint | Blocker / resume |
|---|---|---|---|---|---|---|---|
| 7.1 Data inventory | Define what backup covers. | Deployment docs, backup runbook draft | Inventory PostgreSQL, MinIO/object storage, export artifacts, evidence files, volumes, exclusions. | `lint`; `typecheck`. | Backup scope and exclusions are explicit. | `docs(deploy): define backup restore scope` | Block if storage ownership is unclear. |
| 7.2 PostgreSQL backup script | Create repeatable DB backup. | `scripts/backup/backup-postgres.sh`, docs | Add compose/pg_dump backup, timestamped compressed artifact, non-empty validation, no secret logging. | `bash -n`; local backup integration if DB running. | Non-empty backup artifact is produced safely. | `chore(backup): add postgres backup script` | Block if DB container unavailable; resume after local/VM DB is running. |
| 7.3 PostgreSQL restore script | Create explicit restore process. | `scripts/backup/restore-postgres.sh`, docs | Add restore with confirmation/`--yes`, backup file validation, no secret logging. | `bash -n`; disposable restore if feasible. | Restore is possible only with explicit confirmation. | `chore(backup): add postgres restore script` | Block if disposable DB target unavailable. |
| 7.4 Restore smoke proof | Verify restored app behavior. | `scripts/backup/smoke-restore.sh`, tests/docs | Add health/dashboard/procurement/finance/audit/hash smoke checks after restore. | `bash -n`; integration/build; optional E2E smoke. | Restore proof is repeatable. | `chore(backup): add restore smoke proof` | Block if restore environment cannot be created. |
| 7.5 Runbook/evidence | Document backup/restore. | `docs/deployment/backup-restore-runbook.md`, `docs/evidence/deployment/BACKUP_RESTORE_EVIDENCE.md`, roadmap | Add commands, expected output, limitations, evidence placeholders. | `lint`; `typecheck`. | Operator can follow runbook and fill evidence. | `docs(deploy): add backup restore runbook evidence` | Block only if backup scope remains unresolved. |

### Phase 8 - P2 Richer Dashboard / Procurement / Finance Summaries

| Slice | Purpose | Files likely touched | Implementation task | Tests | Acceptance / evidence | Commit checkpoint | Blocker / resume |
|---|---|---|---|---|---|---|---|
| 8.1 DTO contract | Define backend-owned summary shape. | API DTO docs/types, dashboard/procurement/finance modules | Define queue, blocker, readiness, evidence gap, outbox/Fabric, loss exception DTOs and role rules. | Unit helper tests; build. | Contract is explicit and not fixture-derived. | `feat(summary): define dashboard procurement finance dto contracts` | Block on unclear role visibility/fields. |
| 8.2 Dashboard summary extension | Expand existing dashboard API. | `apps/api/src/modules/dashboard/`, tests | Add role-aware queues/blockers/readiness and server-side filtering. | Unit aggregation tests; integration seeded summary tests. | Dashboard summary is backend-owned and role-filtered. | `feat(summary): add role aware dashboard summary` | Block on missing data relationships. |
| 8.3 Procurement summary endpoint | Power procurement hub with one DTO. | Procurement API module/tests, web API hooks later | Add `/procurement/summary` with pending approvals, RFQs, blockers, matching exceptions, supplier issues. | Unit aggregation tests; integration role-filter tests. | Procurement hub has backend aggregate DTO. | `feat(procurement): add procurement summary dto` | Block on missing procurement workflow data. |
| 8.4 Finance summary endpoint | Power finance pipeline/readiness. | Finance API module/tests | Add `/finance/summary` with opportunity/application statuses, readiness, reviews, contracts, disbursement, closure, loss exception counts. | Unit readiness tests; integration role-filter tests. | Finance summary is backend-owned and restricted. | `feat(finance): add finance summary dto` | Block on unresolved loss exception model if counts depend on Phase 5. |
| 8.5 Frontend summary replacement | Use backend summaries in production routes. | Web dashboard/procurement/finance features, tests, E2E | Consume summary endpoints, add loading/error/empty/permission states, remove production fixture dependency. | UI tests; summary E2E; build. | Production routes use backend DTOs and role-specific summaries. | `feat(summary): connect dashboard procurement finance ui` | Block if endpoints are incomplete. |
| 8.6 Docs/evidence | Record summary capabilities. | Roadmap, API/UI docs, evidence screenshots | Document DTOs, tests, screenshots or UAT traces. | `lint`; `typecheck`. | Summary status and evidence are accurate. | `docs(summary): document richer summary dto evidence` | Block if UAT evidence missing; mark Partial. |

### Phase 9 - P3 Graph Saved Views And Risk Scoring

| Slice | Purpose | Files likely touched | Implementation task | Tests | Acceptance / evidence | Commit checkpoint | Blocker / resume |
|---|---|---|---|---|---|---|---|
| 9.1 Risk contract | Define graph risk metadata without leaking data. | Graph docs/roadmap | Document risk levels/reasons/source IDs, role visibility, and rules from anchors/evidence/approvals/matching/loss/overdue reviews. | `lint`; `typecheck`. | Risk design is explicit and permission-aware. | `docs(graph): define graph risk scoring contract` | Block on product decision for risk semantics. |
| 9.2 Backend risk metadata | Make API own risk labels. | Graph API/service/tests | Add risk scoring helper and role-filtered reasons after source visibility filtering. | Unit scoring tests; integration no-leak tests. | Graph API returns safe risk metadata. | `feat(graph): add backend risk metadata` | Block on missing source fields or leakage risk. |
| 9.3 Query-param filters | Make graph filters shareable. | Graph API query parsing, frontend graph route/model/tests | Add node/risk/status/includeFinance/includeAnchors filters and URL serialization. | Unit parser/URL tests; API integration; graph E2E. | Shared URLs restore filters and cannot bypass RBAC. | `feat(graph): add query param graph filters` | Block on route semantics conflict. |
| 9.4 Saved views API | Persist graph views if feasible. | Prisma schema/migration, graph views API/tests | Add `GraphSavedView` model and create/list/update/delete endpoints with ownership/visibility validation. | Prisma generate; unit validation; integration CRUD/unauthorized tests. | Saved views work or are honestly marked Partial if too large. | `feat(graph): add saved graph views` | Block on migration/scope complexity; resume with query-param-only plan if needed. |
| 9.5 Graph UI saved views/risk | Add reviewer-facing risk and saved view controls. | Web graph UI/model/tests/E2E | Render risk legend/badges, saved view selector/actions if API exists, query filters, no-leak DOM assertions. | UI tests; graph E2E; build. | Risk overlay works and role filtering remains strict. | `feat(graph): add risk overlay and saved view ui` | Block if saved view API is Partial; resume with risk/query filters only. |
| 9.6 Graph evidence/docs | Record graph implementation status. | Graph evidence docs, roadmap, screenshots | Update evidence, screenshots, and roadmap; mark saved views Implemented or Partial. | `lint`; `typecheck`. | Evidence and status match actual graph capability. | `docs(graph): document risk scoring saved view evidence` | Block only if screenshot/evidence status is unknown. |

## Soon-To-Be Implementation Tracking Checklist

Status values:

- `Planned`: not started.
- `In progress`: currently being edited or validated.
- `Complete`: committed and validation passed.
- `Partial`: scaffolding exists but implementation/evidence is incomplete.
- `Blocked`: cannot proceed without external runtime, credentials, product
  decision, or infrastructure.

| Phase | Slice | Status | Commit | Tests run | Evidence | Blocker |
|---|---|---|---|---|---|---|
| 0 | 0.1 Repository state audit | Complete | `90a69b7 docs(roadmap): reconcile soon-to-be repository state` | `corepack pnpm lint`; `corepack pnpm typecheck` | Repository reconciliation table in this file. | None. |
| 0 | 0.2 Phase/slice implementation matrix | Complete | `35cdfe1 docs(roadmap): add phased implementation slices` | `corepack pnpm lint`; `corepack pnpm typecheck` | Phased implementation matrix in this file. | None. |
| 0 | 0.3 Implementation tracking checklist | Complete | `docs(roadmap): add soon-to-be implementation tracker` | `corepack pnpm lint`; `corepack pnpm typecheck` | This tracking checklist. | None. |
| 1 | 1.1 Deployment workflow and secret mapping audit | Complete | `chore(deploy): verify fabric gateway secret mapping` | `bash -n` deploy/validate/smoke scripts; `corepack pnpm lint`; `corepack pnpm typecheck`; `corepack pnpm test:unit` | `docs/evidence/deployment/FABRIC_SECRET_MAPPING_AUDIT.md` | None. |
| 1 | 1.2 Fabric secret validation hardening | Complete | `chore(deploy): harden fabric secret validation` | `bash -n scripts/validate-fabric-secrets.sh`; placeholder valid layout; placeholder missing-key negative layout | `docs/evidence/deployment/FABRIC_SECRET_VALIDATION_EVIDENCE.md` | None. |
| 1 | 1.3 VM evidence collection hardening | Complete | `chore(evidence): sanitize vm deployment evidence collection` | `bash -n scripts/evidence/collect-vm-deployment-evidence.sh`; `DRY_RUN=true` evidence collection; `corepack pnpm lint`; `corepack pnpm typecheck` | `docs/evidence/deployment/VM_DEPLOYMENT_EVIDENCE.md` dry-run row | None. |
| 1 | 1.4 Deployment execution/evidence | Complete | `chore(deploy): record azure vm fabric deployment evidence` | `gh workflow run deploy-azure-vm.yml --ref main`; `gh run watch 27043095990 --exit-status`; SSH evidence collection; public `curl` checks for `/`, `/api/v1/health`, and `/api/v1/integrations/fabric/status` | `docs/evidence/deployment/latest-vm-deployment-evidence.txt`; `docs/evidence/deployment/VM_DEPLOYMENT_EVIDENCE.md`; resolved blocker note `docs/evidence/blockers/2026-06-06-phase-1-slice-1-4-blocker.md` | Resolved. Initial run `27024510947` hit a stale `mepn_api` Docker container conflict; rerun `27043095990` deployed successfully. |
| 1 | 1.5 Deployment roadmap update | Complete | `docs(roadmap): update azure vm deployment status` | `corepack pnpm lint`; `corepack pnpm typecheck` | Azure VM Gateway deployment evidence moved to Implemented; P0 deployment item removed from Soon-To-Be; real proof screenshot dependency remains separate. | None. |
| 2 | 2.1 Verification API/UI readiness | Complete | `test(fabric): verify gateway proof api and ui readiness` | `corepack pnpm --dir apps/api test -- hash-records`; `corepack pnpm --dir apps/api test:integration -- evidence`; `corepack pnpm --dir apps/web test`; `corepack pnpm typecheck`; `corepack pnpm lint`; gated Playwright proof spec remains skipped until live ids are supplied | `docs/evidence/qa/FABRIC_GATEWAY_UAT_EVIDENCE.md` | None. Live screenshot capture still depends on Slice 2.2 live Gateway hash record id. |
| 2 | 2.2 Live Gateway hash precondition | Complete | `docs(evidence): resolve fabric gateway runtime blocker` | VM prereq check; VM-local Fabric install/start/deploy/export; secret validation; worker peer reachability; public API `GET /api/v1/hash-records/:id/fabric-verification` | `docs/evidence/blockers/2026-06-06-phase-2-slice-2-2-blocker.md`; verified hash record `34c5a7e7-5bf3-4246-89ae-b51a2e765ef4` | Resolved with VM-local Fabric test network for FYP/UAT proof. |
| 2 | 2.3 Gated screenshot flow | Complete | `test(uat): capture vm local fabric gateway proof screenshots` | `corepack pnpm exec playwright test tests/e2e/15-fabric-gateway-uat-proof.spec.ts` | `docs/evidence/uat/fabric-gateway-hash-record-verification.png`; `docs/evidence/uat/fabric-gateway-proof-panel.png` | None. |
| 2 | 2.4 Fabric Gateway UAT evidence package | Complete | `docs(evidence): resolve fabric gateway runtime blocker` | `corepack pnpm lint`; `corepack pnpm typecheck`; validation commands listed in evidence doc | `docs/evidence/qa/FABRIC_GATEWAY_UAT_EVIDENCE.md` | None. |
| 2 | 2.5 Proof screenshot roadmap update | Complete | `docs(evidence): resolve fabric gateway runtime blocker` | `corepack pnpm lint`; `corepack pnpm typecheck` | This roadmap update. | None. |
| 3 | 3.1 Auth config and production dev-login guard | Complete | `feat(auth): guard dev login behind environment config` | `corepack pnpm --dir apps/api test:unit -- auth.config`; `corepack pnpm --dir apps/api test:integration -- auth`; `corepack pnpm test:e2e -- tests/e2e/09-auth-flow.spec.ts` | `DEV_AUTH_ENABLED` config, production default guard, and auth test coverage. | None. |
| 3 | 3.2 Invitation schema hardening | Complete | `feat(auth): add invitation persistence model` | `corepack pnpm prisma:generate`; `corepack pnpm --dir apps/api test:unit -- invitation-token`; `corepack pnpm --dir apps/api test:integration -- auth` | Migration replaces raw invite token storage with `tokenHash`; helper tests cover token hashing, expiry, and status resolution. | None. |
| 3 | 3.3 Invitation API | Complete | `feat(auth): add invitation lifecycle api` | `corepack pnpm --dir apps/api test:integration -- auth`; `corepack pnpm lint`; `corepack pnpm typecheck`; `corepack pnpm build` | Backend create/list/revoke/accept endpoints store token hashes only, enforce org-admin/user-create permission, create membership on acceptance, and emit invitation/membership audit events. | None. |
| 3 | 3.4 OIDC adapter/callback | Complete | `feat(auth): add oidc login callback flow` | `corepack pnpm --dir apps/api test:unit -- auth.config`; `corepack pnpm --dir apps/api test:integration -- auth`; `corepack pnpm lint`; `corepack pnpm typecheck`; `corepack pnpm build` | OIDC start/callback endpoints, signed state/nonce validation, issuer/audience/expiry checks, test-provider session mapping, and OIDC audit events. | Real external provider token exchange remains deployment/provider work; no real-provider readiness is claimed. |
| 3 | 3.5 Frontend login/invite UI | Planned | Pending | Pending | Pending auth E2E evidence. | Depends on API slices. |
| 3 | 3.6 Auth docs/UAT | Planned | Pending | Pending | Pending auth evidence docs. | Depends on UI/API slices. |
| 4 | 4.1 Report API DTOs | Planned | Pending | Pending | Pending report DTO tests. | Report field scope must remain conservative. |
| 4 | 4.2 Export job model | Planned | Pending | Pending | Pending migration/test evidence. | Possible schema migration conflict. |
| 4 | 4.3 JSON export/download | Planned | Pending | Pending | Pending export artifact evidence. | Storage/export location decision may be needed. |
| 4 | 4.4 Reports frontend | Planned | Pending | Pending | Pending reports E2E evidence. | Depends on report API/export slices. |
| 4 | 4.5 Reports docs/evidence | Planned | Pending | Pending | Pending report evidence docs. | Depends on export evidence. |
| 5 | 5.1 Loss exception domain contract | Planned | Pending | Pending | Pending domain contract doc. | May require Shariah/product decision. |
| 5 | 5.2 Loss exception domain model | Planned | Pending | Pending | Pending migration/test evidence. | Possible schema migration conflict. |
| 5 | 5.3 Loss exception API/permissions | Planned | Pending | Pending | Pending API integration evidence. | Reviewer permission matrix must be stable. |
| 5 | 5.4 Closure gate | Planned | Pending | Pending | Pending direct API bypass tests. | Depends on exception lifecycle model. |
| 5 | 5.5 Loss exception UI/UAT | Planned | Pending | Pending | Pending UAT screenshots/spec. | Depends on backend slices. |
| 5 | 5.6 Loss exception docs/evidence | Planned | Pending | Pending | Pending evidence docs. | Depends on UAT. |
| 6 | 6.1 Accessibility tooling setup | Planned | Pending | Pending | Pending accessibility smoke evidence. | Possible dependency/tooling conflict. |
| 6 | 6.2 Critical route accessibility specs | Planned | Pending | Pending | Pending critical-route a11y results. | Depends on test helper and stable seeded routes. |
| 6 | 6.3 Accessibility fixes | Planned | Pending | Pending | Pending passing a11y spec. | Depends on findings from Slice 6.2. |
| 6 | 6.4 Accessibility CI/evidence | Planned | Pending | Pending | Pending `ACCESSIBILITY_EVIDENCE.md`. | Depends on stable a11y command. |
| 7 | 7.1 Backup/restore data inventory | Planned | Pending | Pending | Pending backup scope doc. | Storage ownership must be clear. |
| 7 | 7.2 PostgreSQL backup script | Planned | Pending | Pending | Pending backup artifact evidence. | Requires reachable local/VM database. |
| 7 | 7.3 PostgreSQL restore script | Planned | Pending | Pending | Pending restore dry-run evidence. | Requires disposable restore target. |
| 7 | 7.4 Restore smoke proof | Planned | Pending | Pending | Pending restore smoke output. | Depends on backup/restore scripts. |
| 7 | 7.5 Backup/restore docs/evidence | Planned | Pending | Pending | Pending runbook/evidence docs. | Depends on smoke proof or blocker. |
| 8 | 8.1 Summary DTO contract | Planned | Pending | Pending | Pending DTO contract tests/docs. | Role visibility must remain stable. |
| 8 | 8.2 Dashboard summary extension | Planned | Pending | Pending | Pending dashboard summary tests. | Depends on available data relationships. |
| 8 | 8.3 Procurement summary endpoint | Planned | Pending | Pending | Pending procurement summary tests. | Some procurement analytics may remain out of scope. |
| 8 | 8.4 Finance summary endpoint | Planned | Pending | Pending | Pending finance summary tests. | Loss exception fields may depend on Phase 5. |
| 8 | 8.5 Frontend summary replacement | Planned | Pending | Pending | Pending summary E2E evidence. | Depends on backend endpoints. |
| 8 | 8.6 Summary docs/evidence | Planned | Pending | Pending | Pending summary docs/screenshots. | Depends on UI/E2E. |
| 9 | 9.1 Graph risk contract | Planned | Pending | Pending | Pending graph risk contract doc. | Risk semantics may need product decision. |
| 9 | 9.2 Backend graph risk metadata | Planned | Pending | Pending | Pending graph API tests. | Must avoid leaking hidden source data. |
| 9 | 9.3 Query-param graph filters | Planned | Pending | Pending | Pending graph E2E evidence. | Route semantics must remain stable. |
| 9 | 9.4 Saved views API | Planned | Pending | Pending | Pending saved-view API tests. | May be deferred if schema scope is too large. |
| 9 | 9.5 Graph UI saved views/risk | Planned | Pending | Pending | Pending graph screenshots/E2E. | Depends on API slices. |
| 9 | 9.6 Graph evidence/docs | Planned | Pending | Pending | Pending graph evidence docs. | Depends on E2E/screenshots. |
| 10 | 10.1 Final roadmap reconciliation | Planned | Pending | Pending | Pending final roadmap update. | Depends on prior phase outcomes. |
| 10 | 10.2 Final evidence index | Planned | Pending | Pending | Pending `docs/evidence/EVIDENCE_INDEX.md`. | Depends on evidence generated or blockers recorded. |
| 10 | 10.3 Final test matrix | Planned | Pending | Pending | Pending `docs/testing/final-validation-matrix.md`. | Depends on available commands/results. |
| 10 | 10.4 Full regression pass | Planned | Pending | Pending | Pending final validation results. | Block if non-environment validation fails. |
| 10 | 10.5 Final implementation report | Planned | Pending | Pending | Pending release summary. | Depends on final validation/blockers. |

## Proposed Delighter Features

These features are not required for FYP completion, but would improve review,
demo, and product polish.

| Delighter | Value | Safe implementation approach |
|---|---|---|
| Guided demo mode | Opens the correct seeded role, record, and route for reviewers. | Clearly label as demo tooling; do not replace production auth. |
| Verification proof drawer | Explains local hash, stored anchor, chaincode query, transaction ID, and mismatch reasons. | Drive only from `fabric-verification` API response. |
| Audit story timeline | Shows procurement event -> evidence hash -> Fabric anchor -> finance review -> closure. | Use backend audit/hash/anchor data, not Figma mock records. |
| Graph-to-workflow drilldown | Lets reviewers click graph nodes/edges and open exact source records. | Use central entity-route registry and permission checks. |
| Reviewer evidence export pack | Bundles screenshots, hashes, Fabric proof, UAT notes, and limitations. | Generate from API-backed records and sanitized evidence scripts. |
| Operations readiness score | Summarizes API, DB, Redis, worker heartbeat, outbox backlog, Fabric mode, and VM deployment. | Use health/status endpoints only; do not infer external provider health. |
| Demo-only role preview switcher | Speeds walkthroughs across roles. | Feature-flag as demo-only and never use as production auth. |
| Mudarabah compliance explainer | Helps reviewers understand no guaranteed fixed return and loss exception handling. | Keep copy aligned with SRS and Shariah/legal review. |
| First-run deployment checklist UI | Shows operator what remains to configure for a self-hosted SME node. | Pull from real config/readiness endpoints; label unavailable items honestly. |
| Anchor mismatch simulator for training | Demonstrates pending, failed, mismatch, and unavailable verification states. | Keep isolated to demo/test mode; never contaminate production records. |

## Login/Auth Status

Current login is development/demo login when `DEV_AUTH_ENABLED=true` or when
the runtime is not production:

- User enters email.
- User enters organization ID.
- No password is required.

This is intentional for local testing, seeded UAT, and FYP demo speed. It is
now disabled by default in production-like configuration and is not production
authentication.

Future production auth should follow this path:

1. Keep dev login behind `DEV_AUTH_ENABLED=true` or equivalent.
2. Disable dev login by default in production.
3. Add OIDC login with provider configuration and callback handling.
4. Add invitation-token validation for organization onboarding.
5. Audit membership creation, role assignment, invitation acceptance, and login-relevant admin changes.

## Implementation Rules For Future Agents

- Do not copy Figma prototype behavior as production workflow.
- Do not claim real Fabric proof from mock or seeded data.
- Do not expose private keys, cert PEM blocks, tokens, or generated secret env files.
- Do not add UI-only business rule enforcement without backend guards.
- Do not implement guaranteed fixed-return calculations.
- Keep every feature slice small, tested, and documented.
