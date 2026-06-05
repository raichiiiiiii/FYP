# MEPN Phase 0-23 TODO And Blocker Tracker

## Purpose

This document tracks unfinished work from Phase 0 through Phase 23 so the team
can return later, resolve blockers, and finish each task completely.

It is not a replacement for the SRS, SDD, UI contract, ADRs, or implementation
plan. It is a practical recovery checklist for incomplete or partially verified
work.

Last updated: 2026-06-05.

## Current Critical Blockers

| Blocker | Impact | Resolve by |
|---|---|---|
| Docker Desktop daemon became unresponsive during local production compose build | Phase 17 production container build is not fully verified locally | Restart Docker Desktop or test on Linux/VM, then rerun production compose build/up |
| Azure VM host/key details were not provided | Phase 21 manual cloud deployment cannot be executed by Codex | Provide VM public IP/DNS, SSH user, and local key path; do not paste private key contents |
| Azure VM live smoke-test outputs are not recorded | Deployment cannot be marked complete for assessment | Capture `docker compose ps`, logs, `curl localhost`, and `curl PUBLIC_IP` output |
| Fabric reviewer verification is still incomplete beyond worker proof | Chaincode validation, local network startup, and worker Gateway anchoring are proven locally, but API-side direct chaincode verification and reviewer screenshots are still TODO | Implement API direct chaincode query verification, then capture real Gateway reviewer UI evidence |
| GitHub Actions CI/deploy workflows have not been observed on GitHub after push | Automation exists locally but remote execution is not confirmed | Push current branch, inspect Actions run, fix workflow issues if any |
| Some frontend modules still use fixtures/mock states | Demo is reviewable but not fully API-backed | Replace fixtures with typed API hooks and backend contracts slice by slice |

## High-Priority Return Checklist

Complete these before claiming the MVP is fully deployment-ready:

- [ ] Restart Docker Desktop or use a Linux VM.
- [ ] Run `docker compose -f docker-compose.prod.yml --env-file .env.production.example config`.
- [ ] Create a non-committed `.env.production` for deployment testing.
- [ ] Run `docker compose -f docker-compose.prod.yml --env-file .env.production build`.
- [ ] Run `docker compose -f docker-compose.prod.yml --env-file .env.production up -d`.
- [ ] Run `docker compose -f docker-compose.prod.yml --env-file .env.production ps`.
- [ ] Run `curl http://localhost/api/v1/health`.
- [ ] Deploy manually to Azure VM.
- [ ] Capture VM smoke-test outputs without secrets.
- [ ] Configure GitHub secrets: `AZURE_VM_HOST`, `AZURE_VM_USER`, `AZURE_VM_SSH_KEY`.
- [ ] Trigger GitHub Actions deployment manually once.
- [x] Run full E2E tests and record results (`corepack pnpm test:e2e`, 18/18 passed on 2026-06-05).
- [ ] Update `docs/testing/test-report-template.md` with live E2E and deployment results.

## Phase-by-Phase Tracker

### Phase 0 - Repository Artifact Intake And Source Of Truth

Status: Mostly complete.

Completed:

- SRS exists under `docs/requirements/`.
- SDD exists under `docs/design/`.
- UI contract exists under `docs/ui/`.
- Figma Make reference is stored under `docs/design/figma-make-reference/`.
- Source-of-truth order is documented.

Unfinished / verify later:

- [ ] Confirm no production source imports from `docs/design/figma-make-reference/prototype-src`.
- [ ] Confirm Figma reference bundle contains no `node_modules`, `dist`, `build`, coverage, or env files.
- [ ] Clean up any legacy duplicate doc paths after confirming git history and references, especially old singular folders such as `docs/requirement/` or `docs/test/` if they remain tracked.

### Phase 1 - Agent Operating Instructions

Status: Complete.

Completed:

- `AGENTS.md` exists.
- Source-of-truth order is documented.
- Figma reference-only rule is documented.
- Required implementation and verification behavior is documented.

Unfinished / verify later:

- [ ] Keep `AGENTS.md` updated if the source-of-truth order or verification commands change.

### Phase 2 - Figma Reference Documentation

Status: Mostly complete.

Completed:

- `docs/design/figma-make-reference/README.md` exists.
- `docs/design/figma-make-reference/FIGMA_SOURCE.md` exists.
- Figma is documented as visual and interaction reference only.

Unfinished / verify later:

- [ ] Confirm Figma screenshots/reference assets are complete enough for review.
- [ ] Re-run import isolation check after future frontend refactors.

### Phase 3 - Figma-To-UI-Contract Mapping

Status: Complete enough for current implementation.

Completed:

- `docs/ui/figma-to-ui-contract-map.md` exists.
- Figma reference files are mapped to production areas and UI contract responsibilities.

Unfinished / verify later:

- [ ] Add a route/screen inventory table if reviewers need file-by-file traceability from Figma to production routes.
- [ ] Update the map when Admin, Reports, or future Graph/Canvas features are expanded.

### Phase 4 - Architecture Decision Records

Status: Complete for baseline decisions.

Completed:

- Source-of-truth ADR exists.
- Figma reference-only ADR exists.
- Azure Student VM Docker Compose ADR exists.
- Implementation stack ADR exists.
- Integration boundary and module roadmap ADRs exist.

Unfinished / verify later:

- [ ] Add ADR for authentication/OIDC strategy before real OIDC implementation.
- [ ] Add ADR for production secret management if moving beyond Azure Student VM.
- [ ] Add ADR for real Fabric Gateway integration once selected.

### Phase 5 - Implementation Master Plan

Status: Complete as roadmap.

Completed:

- `docs/implementation-plan.md` exists.
- Slices 0-10 are documented.

Unfinished / verify later:

- [ ] Update the plan with actual completion state after each future PR.
- [ ] Add backend-specific implementation slices where frontend foundations currently outpace backend contracts.

### Phase 6 - Slice 1: Global Shell, Routing, And RBAC

Status: Implemented as frontend foundation.

Completed:

- Route metadata and role-aware navigation exist.
- Permission-denied state exists.
- Frontend route visibility tests exist.

Unfinished / verify later:

- [ ] Confirm backend permission checks are the source of truth for every protected mutation.
- [ ] Add/verify E2E tests for admin, procurement officer, financier, Shariah reviewer, and auditor navigation.
- [ ] Confirm direct URL access behavior in a real browser after deployment.

### Phase 7 - Slice 2: Dashboard And Smart Task Inbox

Status: Implemented as frontend foundation.

Completed:

- Role-aware dashboard model and tests exist.
- KPI/task inbox surfaces exist.
- Audit/outbox/Fabric pending indicators are represented.

Unfinished / verify later:

- [ ] Replace dashboard fixtures with backend aggregation DTOs.
- [ ] Add live task inbox API once workflow tasks are persisted centrally.
- [ ] Add E2E dashboard checks for at least two roles.

### Phase 8 - Slice 3: Mudarabah Applications List

Status: Implemented as frontend foundation.

Completed:

- Application status model exists.
- Application list/filter/open-workspace behavior exists.
- Tests cover frontend behavior.

Unfinished / verify later:

- [ ] Confirm all application statuses match final SRS/UI contract terminology.
- [ ] Replace any fixture-only application data with API-backed hooks.
- [ ] Add integration/E2E test for opening an application from the list.

### Phase 9 - Slice 4: Application Workspace

Status: Partially complete.

Completed:

- Workspace route/shell exists.
- Overview and status timeline foundation exists.
- Role-specific read/action surfaces are represented.

Unfinished / verify later:

- [ ] Implement remaining sub-slices 4C-4H fully: evidence checklist, due diligence, Shariah review, contract/disbursement status, monitoring, closure, tests, and docs.
- [ ] Add backend-backed reviewer decision mutations.
- [ ] Enforce that contract generation is blocked until required approvals exist.
- [ ] Enforce that disbursement cannot be recorded without executed contract.
- [ ] Add integration/E2E tests for blocked and allowed transitions.

### Phase 10 - Slice 5: Opportunities

Status: Implemented as frontend foundation.

Completed:

- Opportunity list/create model exists.
- Revenue-generating eligibility validation exists.
- Non-revenue/internal consumption cases are blocked in frontend logic.

Unfinished / verify later:

- [ ] Ensure backend enforces the same eligibility rules.
- [ ] Implement full application draft creation from a valid opportunity.
- [ ] Add integration/E2E tests for valid and invalid opportunity creation.

### Phase 11 - Slice 6: Procurement Workflow

Status: Partially complete.

Completed:

- Procurement dashboard/list foundation exists.
- Requisition model/create/view/approval visibility foundation exists.

Unfinished / verify later:

- [ ] Complete RFQ/RFP/tender screens and backend flow.
- [ ] Complete quotation comparison.
- [ ] Complete purchase order detail and status transitions.
- [ ] Complete receipt/service confirmation.
- [ ] Complete invoice and three-way match.
- [ ] Add procurement timeline per entity.
- [ ] Enforce segregation rule: requester cannot approve own requisition.
- [ ] Add integration/E2E tests for full procurement happy path and mismatch path.

### Phase 12 - Slice 7: Ledger, Profit/Loss, And Closure

Status: Implemented as domain-safe frontend foundation.

Completed:

- Project ledger view exists.
- Revenue/cost evidence linking is represented.
- Preliminary P/L summary exists.
- Profit distribution display avoids guaranteed fixed return.
- Tests cover positive profit, genuine loss, loss exception, and no guaranteed fixed return.

Unfinished / verify later:

- [ ] Connect ledger entries and P/L summaries to complete backend persistence.
- [ ] Implement full loss exception workflow.
- [ ] Implement closure pack export prerequisites.
- [ ] Add audit events for finance ledger and closure actions.
- [ ] Add integration/E2E tests with real API/database state.

### Phase 13 - Slice 8: Audit And Fabric Verification

Status: Implemented as honest status UI foundation with API-backed hash-detail
Fabric verification states.

Completed:

- Audit timeline and Fabric anchor status display exist.
- Hash-detail Fabric verification panel calls the API-backed
  `/hash-records/:id/fabric-verification` endpoint.
- UI distinguishes mock, pending, submitted, verified stored metadata, failed,
  unavailable, and anchored-not-fully-verified states.
- Tests cover anchor states, including E2E coverage for seeded Fabric evidence
  states.

Unfinished / verify later:

- [x] Connect hash-detail verification display to live hash/anchor API records.
- [x] Implement real worker Fabric Gateway adapter behind `FABRIC_MODE=gateway`.
- [ ] Add downloadable verification evidence for reviewers.
- [x] Add audit search/filter/pagination E2E tests.
- [x] Prove worker real Fabric Gateway anchoring against a local Fabric network.
- [x] Run Go chaincode unit/build-tag validation after Go is available on `PATH`.
- [ ] Add API-side direct chaincode query verification.
- [ ] Capture reviewer screenshots for real Gateway evidence states.

### Phase 14 - Slice 9: Network Canvas

Status: Implemented as foundation.

Completed:

- Network graph/canvas route/view exists.
- Graph model exists.
- Permission-filtered visibility is represented.
- Tests cover graph visibility filtering.

Unfinished / verify later:

- [ ] Replace fixture/read-model data with complete backend graph read model.
- [ ] Ensure unauthorized nodes and edges are filtered on the backend.
- [ ] Add source-record navigation from graph nodes.
- [ ] Add risk/status overlays after core records are stable.

### Phase 15 - Slice 10: Integrations, Operations, Admin, And Reports

Status: Partially complete.

Completed:

- Integrations status cards exist.
- Operations health/status surfaces exist.
- ERP, Fabric, webhook, and outbox states are represented.
- Tests cover status rendering.

Unfinished / verify later:

- [ ] Complete Admin users/roles operational screens if not fully covered by earlier identity work.
- [ ] Complete Reports/export screens.
- [ ] Replace static status fixtures with real health/outbox/reconciliation endpoints.
- [ ] Add retry/reconciliation detail screens for failed integration actions.
- [ ] Add E2E tests for degraded/unavailable integration states.

### Phase 16 - Testing Strategy And Quality Gates

Status: Documentation complete, execution incomplete.

Completed:

- `docs/testing/testing-strategy.md` exists.
- `docs/testing/test-report-template.md` exists and includes latest local `corepack pnpm verify` result.
- Root `verify` script exists.

Unfinished / verify later:

- [ ] Add `format:check` script or remove it from quality-gate expectations.
- [ ] Run and record `corepack pnpm test:e2e`.
- [ ] Run and record integration tests against clean test infrastructure.
- [ ] Add deployment smoke-test results after Azure VM deployment.
- [ ] Add test traceability to SRS requirement IDs.

### Phase 17 - Containerization For Local And VM Deployment

Status: Implemented but not fully verified due to Docker blocker.

Completed:

- `.env.production.example` exists.
- `docker-compose.prod.yml` exists.
- Frontend/API/worker Dockerfiles exist.
- Nginx reverse proxy config exists.
- Compose config validates with `.env.production.example`.

Blocker:

- Docker Desktop daemon became unresponsive during local production compose build.

Unfinished / verify later:

- [ ] Restart Docker Desktop or use a Linux VM.
- [ ] Run production compose build successfully.
- [ ] Run production compose up successfully.
- [ ] Confirm API health through reverse proxy.
- [ ] Inspect logs for crash loops.
- [ ] Optimize Docker images if build size/time is unacceptable.

### Phase 18 - Azure Student VM Deployment Documentation

Status: Documentation complete.

Completed:

- `docs/deployment/azure-student-vm-deployment.md` explains VM setup, Docker install, clone, env setup, compose build/start, smoke tests, rollback, troubleshooting, and limitations.

Unfinished / verify later:

- [ ] Execute the guide on a real Azure Student VM.
- [ ] Add actual deployment notes without exposing secrets.
- [ ] Capture and store smoke-test evidence.

### Phase 19 - GitHub Actions CI

Status: Workflow created locally.

Completed:

- `.github/workflows/ci.yml` exists.
- CI runs on pull requests and pushes to `main`.
- CI runs install, lint, typecheck, tests, and build.

Unfinished / verify later:

- [ ] Push workflow and confirm GitHub Actions CI run passes.
- [ ] Confirm `pnpm install --frozen-lockfile` plus root postinstall works on GitHub-hosted Ubuntu.
- [ ] Consider adding integration/E2E jobs after infrastructure setup is stable.

### Phase 20 - GitHub Actions Deployment To Azure VM

Status: Workflow created locally, not executed.

Completed:

- `.github/workflows/deploy-azure-vm.yml` exists.
- Uses GitHub secrets for host, user, and SSH key.
- Deploys from `/opt/mepn`.
- Pulls latest `main`, builds compose, starts containers, prints compose status.

Unfinished / verify later:

- [ ] Ensure manual VM deployment succeeds first.
- [ ] Add repository secrets: `AZURE_VM_HOST`, `AZURE_VM_USER`, `AZURE_VM_SSH_KEY`.
- [ ] Trigger workflow manually.
- [ ] Confirm workflow does not print secrets or `.env.production`.
- [ ] Consider requiring CI success before deploy if not already enforced by branch protection.

### Phase 21 - Manual Cloud Deployment Execution

Status: Blocked.

Blocker:

- VM public IP/DNS, SSH username, and local SSH key path were not provided.

Unfinished / verify later:

- [ ] SSH into Azure VM.
- [ ] Install Docker Engine and Compose plugin.
- [ ] Clone `https://github.com/raichiiiiiii/FYP.git` into `/opt/mepn`.
- [ ] Create `/opt/mepn/.env.production`.
- [ ] Run production compose build and up.
- [ ] Capture `docker compose ps`.
- [ ] Capture `docker compose logs --tail=100`.
- [ ] Capture `curl -I http://localhost`.
- [ ] Capture `curl -I http://PUBLIC_IP`.
- [ ] Update deployment/test docs with results.

### Phase 22 - Final Deployment Documentation And Demo Package

Status: Documentation complete, pending live deployment evidence.

Completed:

- README was updated for review.
- Azure deployment guide was updated.
- `docs/demo-script.md` exists.
- `docs/testing/test-report-template.md` includes latest local verification results.
- Known limitations are documented.

Unfinished / verify later:

- [ ] Add live Azure VM deployment evidence after Phase 21.
- [ ] Add E2E/UAT results after full workflow testing.
- [ ] Add reviewer/supervisor sign-off details when available.

### Phase 23 - Agentic Coding Operating Loop

Status: Adopted as operating discipline.

Completed:

- Future tasks should follow the before-edit and after-edit operating loop.
- Acceptance checklist is defined by the user.
- Review prompt is defined by the user.

Unfinished / verify later:

- [ ] Continue applying the operating loop to every future implementation slice.
- [ ] Optionally codify the loop into `AGENTS.md` if the team wants it as a permanent repository rule.

## Cross-Phase Feature TODOs

These cut across multiple phases and should be planned as small PRs.

### Backend/API Completion

- [ ] Ensure every frontend mutation has a matching backend endpoint.
- [ ] Ensure backend permission checks protect every mutation.
- [ ] Add audit events for all state-changing actions.
- [ ] Add outbox events for all external integration side effects.

### Frontend Data Layer

- [ ] Remove remaining direct/raw fetch usage inside page components.
- [ ] Replace fixture data with typed API hooks gradually.
- [ ] Keep loading, empty, error, and permission-denied states on every screen.

### Procurement

- [ ] Complete RFQ/quotation/PO/receipt/invoice/matching.
- [ ] Add record detail pages for each procurement object.
- [ ] Add per-entity audit timeline links.

### Finance

- [ ] Complete evidence checklist actions.
- [ ] Complete due diligence and Shariah decision mutations.
- [ ] Complete contract generation rules.
- [ ] Complete disbursement, ledger, profit/loss, and closure backend workflows.

### Evidence And Audit

- [ ] Complete real document upload/download/preview through MinIO.
- [ ] Complete downloadable evidence pack export.
- [x] Complete hash verification UX with live backend verification for local hash
  and stored Fabric metadata states.
- [ ] Keep Fabric states honest until real anchoring exists.

### Deployment And Operations

- [ ] Finish Docker production build verification.
- [ ] Finish first Azure VM deployment.
- [ ] Confirm GitHub Actions CI and deploy workflows in GitHub.
- [ ] Add backup/restore test evidence.
- [ ] Add HTTPS/domain configuration if needed for demo or UAT.

## Commands To Re-Run When Returning

Local verification:

```bash
corepack pnpm verify
```

Local infrastructure:

```bash
docker compose -f infra/docker-compose.yml up -d
```

Production compose syntax:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production.example config
```

Production compose build/start after creating `.env.production`:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production build
docker compose -f docker-compose.prod.yml --env-file .env.production up -d
docker compose -f docker-compose.prod.yml --env-file .env.production ps
docker compose -f docker-compose.prod.yml --env-file .env.production logs --tail=100
curl http://localhost/api/v1/health
```

E2E testing:

```bash
corepack pnpm test:e2e
```

Manual Azure deployment smoke checks:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production ps
docker compose -f docker-compose.prod.yml --env-file .env.production logs --tail=100
curl -I http://localhost
curl -I http://PUBLIC_IP
curl http://localhost/api/v1/health
```
