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

- Dev login is available for demo/UAT; production OIDC/invitation auth is not complete.
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
| Run Azure VM Fabric Gateway deployment | evidence-only; environment-blocked | GitHub Actions workflow, Fabric secret materialization scripts, validation script, smoke script, Docker Compose read-only secret mounts, and deployment docs exist. No latest VM run evidence is recorded yet. | Run the `Deploy to Azure VM` workflow against the configured VM and capture sanitized deployment evidence. |
| Generate real Fabric proof screenshots | evidence-only; environment-blocked | API-side `ReadAnchor` verification, web proof panel, and gated Playwright screenshot flow exist. The gated spec skips until a live Gateway-anchored hash record id is provided. | Create or locate a real Gateway-anchored hash record, set `FABRIC_GATEWAY_UAT_HASH_RECORD_ID`, and run the gated UAT screenshot spec. |
| Production OIDC/invitation flow | implementation-required; partially scaffolded | Runtime auth is still dev-login oriented. `OIDC_ENABLED` is surfaced in session data and placeholder OIDC files exist, but no complete OIDC start/callback flow is implemented. Prisma has an `Invitation` model, but it stores a raw token and there is no complete invitation lifecycle API/UI. | Add production dev-login guard, token-hash invitation lifecycle, OIDC test/provider adapter, frontend login mode handling, audit events, and UAT evidence. |
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
| Fabric chaincode/local network | Audit anchor chaincode, local Fabric test network scripts, Gateway env export helper. | `chaincode/audit-anchor-go/`, `infra/fabric/` |
| Graph/canvas | Read-only project graph with role-filtered procurement, finance, hash-record, and anchor overlay nodes. | `apps/api/src/modules/graph/`, `apps/web/src/features/graph/` |
| Integrations | Integration status cards, Fabric runtime mode display, outbox visibility, retry/degraded/unavailable states. | `apps/api/src/modules/integrations/`, `apps/web/src/features/integrations/` |
| Operations | Worker heartbeat model/API/UI for queue and worker liveness visibility. | `apps/api/prisma/schema.prisma`, `apps/api/src/modules/integrations/`, `apps/web/src/features/operations/` |
| Admin and identity | Organization setup, role/user membership management, admin demo surfaces. | `apps/api/src/organizations/`, `apps/api/src/users/`, `apps/web/src/features/identity/` |
| Reports demo surface | Reports landing/demo cards with honest partial/export limitations. | `apps/web/src/features/reports/` |
| CI | GitHub Actions CI for install, lint, typecheck, tests, and build. | `.github/workflows/ci.yml` |
| Deployment | Docker Compose production setup and Azure Student VM deployment documentation. | `docker-compose.prod.yml`, `deploy/`, `docs/deployment/azure-student-vm-deployment.md` |
| Fabric secret delivery | GitHub Actions VM secret materialization, validation, smoke, and evidence scripts. | `.github/workflows/deploy-azure-vm.yml`, `scripts/deploy/`, `scripts/validate-fabric-secrets.sh` |
| Testing | Unit/component/API tests and Playwright E2E suite covering critical demo flows. | `tests/e2e/`, `apps/*/test/` |
| Documentation | ADRs, UI contract docs, Figma reference docs, demo script, UAT/testing strategy, roadmap trackers. | `docs/` |

## Partially Implemented Features

| Area | Current state | What remains |
|---|---|---|
| Real Fabric Gateway UAT proof screenshots | Gated Playwright flow exists. | Needs `FABRIC_GATEWAY_UAT_HASH_RECORD_ID` from a live Gateway-anchored hash record. |
| Azure VM Gateway deployment evidence | Workflow, scripts, mounts, and docs exist. | Must run deployment workflow on the VM and capture sanitized evidence. |
| Formal UAT execution | UAT checklist/templates exist. | Reviewer-led execution and signed evidence package remain pending. |
| Reports | Demo reports exist. | Backend aggregate DTOs, audited export jobs, generated files, and download routes remain incomplete. |
| Production authentication | Dev login works. | Real OIDC, invite-token validation, expiry/revocation, MFA/password policy decisions remain incomplete. |
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
| P0 | Run Azure VM Fabric Gateway deployment | Trigger existing GitHub Actions deployment workflow using configured repository secrets. | Sanitized VM evidence in `docs/evidence/deployment/VM_DEPLOYMENT_EVIDENCE.md`. |
| P0 | Generate real Fabric proof screenshots | Use a live Gateway-anchored hash record and run gated UAT Playwright spec. | `fabric-gateway-hash-record-verification.png` and `fabric-gateway-proof-panel.png`. |
| P1 | Production OIDC/invitation flow | Disable dev login by default in production, add OIDC callback and invite validation. | Auth E2E, audit events, UAT login screenshots. |
| P1 | Report aggregate DTOs and exports | Add procurement, finance, audit, and integration report DTOs plus export jobs. | API tests, downloadable report artifacts, audit events. |
| P1 | Loss exception workflow | Add reviewer classification endpoints and UI for genuine loss vs breach/negligence/fraud. | Workflow tests and UAT scenario. |
| P2 | Accessibility automation | Add Playwright axe or equivalent checks for demo-critical routes. | CI accessibility report. |
| P2 | Backup/restore proof | Add database/object-storage backup and restore scripts. | Restore run log and smoke-test evidence. |
| P2 | Richer dashboard/procurement/finance summaries | Add backend-owned summary DTOs for queues, blockers, exceptions, and review readiness. | API tests and UI rendering tests. |
| P3 | Graph saved views and risk scoring | Add backend-owned risk metadata, query-param filters, and optional saved views. | Graph API tests and E2E role-filtering tests. |

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

Current login is development/demo login:

- User enters email.
- User enters organization ID.
- No password is required.

This is intentional for local testing, seeded UAT, and FYP demo speed, but it is
not production authentication.

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
