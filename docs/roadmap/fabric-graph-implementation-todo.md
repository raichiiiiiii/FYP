# Fabric, Graph, Integration Roadmap TODO

## Purpose

This file records what remains after the local safe implementation pass across
the Fabric / graph / integration roadmap. It separates completed repository work
from blockers that require external infrastructure, credentials, product
decisions, or deeper backend implementation.

## Completion Snapshot

| Phase | Area | Current repository status | Remaining status |
|---|---|---|---|
| 0 | Roadmap baseline and traceability | Complete. Module roadmap, graph feature intake, integration outbox feature intake, and implementation plan exist. | None. |
| 1 | Fabric Gateway ADR and environment contract | Complete. ADR-014, env contract, API/worker config readers, and config tests exist. | None. |
| 2 | Fabric chaincode and local test network | Partially complete. Go `audit-anchor` chaincode source, pure unit tests, local test-network plan, PowerShell wrappers, Gateway material export helper, and artifact ignore policy exist. | Blocked by local Go/Fabric toolchain execution, Fabric Contract API wrapper validation, and actual local Fabric network setup/deployment. |
| 3 | Worker real Fabric Gateway adapter | Repository implementation complete for the worker boundary. `apps/worker` now has a Fabric Gateway SDK adapter selected by `FABRIC_MODE=gateway`, mock mode remains isolated, deterministic anchor IDs are derived from idempotency keys, and mocked Gateway unit tests cover hash-only payloads and failure classification. | Real transaction submission is still unproven until local Fabric network material and tooling are available. |
| 4 | Fabric metadata API and status model | Partially complete. API exposes Fabric mode/config status without leaking secret values, `AuditAnchor` now has nullable real Gateway metadata fields, worker anchor persistence stores those fields when present, and hash-record anchor status returns typed Fabric metadata. | API tests for every submitted/committed/verified/failed/mock/unavailable state and a real Fabric verification endpoint remain required. |
| 5 | Evidence, audit, and hash verification workflow | Partially complete from prior audit/evidence work. | Needs real Gateway transaction/chaincode verification endpoint work and local Fabric proof. |
| 6 | Graph UI Fabric anchor overlay | Not complete. | Needs backend read model for anchor/hash nodes and permission-filtered overlay data. |
| 7 | Integrations and operations Gateway mode UI | Partially complete. Backend status support and frontend Fabric mode/status card exist. | Worker health heartbeat remains required. |
| 8 | Unit test expansion | Partially complete. Config, API status, gateway-mode mock-guard, Gateway adapter, payload builder, and adapter registry tests exist. | Graph overlay, verification-helper, and permission-label tests remain required. |
| 9 | Integration test expansion | Not complete. | Requires local Fabric test network or gated CI service. |
| 10 | Browser E2E and screenshot documentation | Partially complete. E2E now confirms the Fabric runtime card on the Integrations route. | Graph overlay E2E, screenshot documentation, and seeded real/mock anchor states remain required. |
| 11 | UAT testing | Partially complete. Fabric mode/evidence fields, evidence package template, and mock-vs-gateway tester instructions exist. | Formal reviewer-led UAT execution remains required. |
| 12 | CI, deployment, and release readiness | Partially complete from existing CI/deployment docs, Fabric secret-mount docs, and release note. | Needs optional gated Fabric integration workflow and automated secret delivery. |
| 13 | Post-demo product hardening | Not complete. | Requires product hardening backlog execution. |

## Blockers

| ID | Phase | Area | Blocker | Impact | Proposed resolution | Owner | Status |
|---|---|---|---|---|---|---|---|
| FG-001 | 2 | Fabric chaincode | Go `audit-anchor` chaincode source and pure unit tests now exist under `chaincode/audit-anchor-go/`. `go version` failed because Go is not installed in this Windows environment. | Real Fabric anchoring still cannot be proven until chaincode tests and deployment run against a Fabric network. | Install Go and Fabric tooling, run `go test ./...`, validate the `fabric` build-tag wrapper, then deploy the contract to the local Fabric test network. | Integrations | Partial |
| FG-002 | 2 | Fabric local network | Local Fabric test-network PowerShell wrappers and Gateway material export helper are committed under `infra/fabric/`. `check-prereqs.ps1` and `start-local-network.ps1` fail before network startup because Go and Fabric samples test-network are missing. | Gateway adapter and integration tests now have a scripted target, but the target is not yet provisioned or proven in this environment. | Install Fabric samples/binaries and Go, then run `infra\fabric\scripts\start-local-network.ps1` and `export-gateway-env.ps1`. | Integrations / Operations | Partial |
| FG-003 | 3 | Worker adapter | Real Fabric Gateway SDK adapter is implemented behind the worker outbox adapter registry. `FABRIC_MODE=mock` uses the mock adapter; `FABRIC_MODE=gateway` uses the Gateway adapter and never returns mock success. The adapter loads configured cert/key/TLS material, submits `CreateAnchor`, returns SDK transaction metadata only when supplied, and maps configuration/unavailable/validation failures. | Gateway mode can now be selected in code, but a real Fabric transaction cannot be proven until the local test network, MSP material, and chaincode deployment exist. | Install the missing local Fabric tooling/material, export Gateway env, then run the gated integration test once it exists. | Integrations | Partial |
| FG-004 | 3 | Idempotency | Worker Gateway payloads now derive `idempotencyKey = fabric:{organizationId || global}:{entityType}:{entityId}:{canonicalHash}` when absent and `anchorId = sha256(idempotencyKey)`. Chaincode reconciles duplicate same-anchor/same-hash submissions by returning the existing anchor. | Deterministic worker-side payload behavior is covered with unit tests, but duplicate reconciliation is not proven against a real peer/orderer. | Prove duplicate same-hash handling in gated Fabric integration tests after the local test network is available. | Integrations | Partial |
| FG-005 | 4 | Database metadata | `AuditAnchor` now has migration-backed nullable fields for transaction ID, block number, channel, chaincode, commit status, endorsement status, and verification timestamp. Hash-record anchor status exposes these fields. | API can represent real Gateway metadata when a real adapter supplies it. | Keep closed for schema/API shape; continue state-specific tests and verification endpoint work under Phase 4/5 tasks. | Evidence / Audit | Closed |
| FG-006 | 5 | Hash canonicalization docs | Reviewer-facing hash explanation lacked canonicalization detail from backend. | Verification UX was underspecified for auditors. | Added canonical hash verification guide based on `AuditHashService` behavior. | Evidence / Audit | Closed |
| FG-007 | 6 | Graph anchor overlay data | Backend graph read model does not expose anchor/hash overlay nodes. | Graph cannot visualize Fabric/evidence relationships. | Extend graph read model with permission-filtered anchor/hash nodes and edges. | Graph / Evidence | Open |
| FG-008 | 7 | Worker health | Worker has no health heartbeat/status endpoint. | Operations UI cannot distinguish idle, stopped, degraded, and unavailable worker states. | Add worker heartbeat table or API health endpoint and surface it in operations UI. | Operations | Open |
| FG-009 | 7 | Gateway UI card | Frontend did not render the Fabric mode/status endpoint. | Reviewers previously had to inspect API/docs to see mock vs gateway mode. | Added Integrations Fabric card using `GET /api/v1/integrations/fabric/status`. | Integrations UI | Closed |
| FG-010 | 9 | Real integration tests | No gated real Fabric integration test environment exists. | CI cannot prove real Gateway anchoring. | Add optional CI job gated by Fabric secrets or run local Fabric network in integration tests. | QA / Operations | Open |
| FG-011 | 10 | E2E evidence states | Browser tests cannot cover real verified Fabric state without real adapter or controlled fixture endpoint. | UI screenshot documentation remains limited to mock/pending/failed states. | Add seeded mock and real-mode test cases once API model and adapter exist. | QA | Open |
| FG-012 | 11 | UAT instructions | UAT materials previously lacked real Gateway setup and evidence capture fields. | Reviewers could confuse mock prototype state with real Fabric verification. | Added Fabric mode/evidence fields, UAT evidence package template, and mock-vs-gateway tester instructions. | QA / Product | Closed |
| FG-013 | 12 | Azure VM secrets | Azure VM secret mounting is documented and Compose mounts `deploy/fabric` read-only into API/worker. GitHub Actions secret handling for Fabric materials is not implemented. | Gateway mode has a documented VM file-mount path, but automated secret delivery remains blocked. | Add GitHub Actions or external secret-manager handling for Fabric materials when real Gateway deployment is ready. | Operations | Partial |
| FG-014 | 13 | Product hardening | Real OIDC, report exports, loss exception workflow, and accessibility automation remain outside the Fabric slice. | Demo can proceed with caveats, but production readiness is incomplete. | Track these in post-demo hardening backlog with owners and acceptance tests. | Product / Engineering | Open |

## TODO Checklist

### Phase 2 - Fabric Chaincode And Test Network

- [x] Define chaincode package location and language.
- [x] Implement hash-only audit anchor chaincode.
- [x] Add chaincode unit tests.
- [ ] Run chaincode unit tests after Go is installed locally or in CI.
- [ ] Validate Fabric Contract API wrapper with the `fabric` build tag after Fabric dependency/toolchain setup.
- [x] Add local Fabric test network instructions.
- [x] Add local Fabric test network start/stop scripts.
- [x] Add local Gateway material export helper.
- [ ] Execute local Fabric test network scripts after Fabric samples and Go are installed.
- [x] Ensure generated certs, keys, ledgers, and channel artifacts are ignored.

### Phase 3 - Worker Real Gateway Adapter

- [x] Prevent gateway mode from returning mock anchor success.
- [x] Add Fabric Gateway SDK dependency.
- [x] Implement adapter using configured MSP, cert, key, TLS cert, channel, and chaincode.
- [x] Preserve outbox retry behavior for Gateway failures.
- [x] Persist reconciliation records for anchored, failed, configuration-error, and unavailable states.
- [x] Add adapter unit tests with mocked SDK client.
- [ ] Prove real Gateway submission against the local Fabric test network.

### Phase 4 - API Status And Metadata

- [x] Add API Fabric mode/configuration status summary.
- [x] Add schema/API shape for real Gateway transaction metadata.
- [ ] Add API tests for submitted, committed, verified, failed, mock, and unavailable states.
- [x] Confirm no secret path, endpoint, private key, or certificate body leaks through API responses.

### Phase 5 - Evidence And Audit Verification

- [x] Add reviewer-facing canonical hash explanation.
- [ ] Link audit events to real Gateway verification records.
- [ ] Show real transaction/chaincode references only when backend evidence exists.
- [ ] Add tests for every Fabric anchor display state.

### Phase 6 - Graph Overlay

- [ ] Extend graph DTO with anchor/hash nodes and evidence edges.
- [ ] Add permission filtering for anchor context.
- [ ] Add graph overlay legend and selected-node details.
- [ ] Add graph tests proving unauthorized finance/evidence nodes remain hidden.

### Phase 7 - Integrations And Operations UI

- [x] Add frontend API hook for Fabric status endpoint.
- [x] Add Fabric status card showing mock, gateway, degraded, unavailable, pending, and retrying states.
- [ ] Add worker heartbeat/queue status support.
- [x] Link operations screen to deployment runbook.

### Phase 8 - Unit Tests

- [x] Cover API and worker Fabric env config readers.
- [x] Cover worker gateway-mode mock guard.
- [x] Cover API Fabric status redaction.
- [x] Cover frontend Fabric status card.
- [x] Cover real Gateway adapter with mocked SDK.
- [ ] Cover graph overlay mapper and permission labels.

### Phase 9 - Integration Tests

- [ ] Add mock-mode worker/outbox integration tests.
- [ ] Add gated real Fabric integration tests.
- [ ] Add API integration tests for anchor status and reconciliation.
- [ ] Add graph integration tests for anchor overlay and role filtering.

### Phase 10 - Browser E2E And Screenshots

- [x] Add Playwright flow for Fabric status card.
- [ ] Add Playwright flow for graph anchor overlay.
- [ ] Add screenshots for mock, pending, failed, unavailable, and verified states.
- [ ] Ensure screenshots never label mock anchors as real verified Fabric.

### Phase 11 - UAT

- [x] Update UAT checklist with Fabric mode and verification evidence fields.
- [x] Add UAT evidence package template.
- [x] Add tester instructions for mock vs gateway mode.

### Phase 12 - CI, Deployment, Release Readiness

- [ ] Add optional gated Fabric integration CI job.
- [x] Add Azure VM Fabric secret-mount documentation.
- [ ] Add GitHub Actions or external secret-manager handling for Fabric cert/key material.
- [x] Add release note separating demo mock mode from real Gateway readiness.

### Phase 13 - Post-Demo Hardening

- [ ] Production OIDC and invitation flow.
- [ ] Worker health endpoint.
- [ ] Backend summary DTOs for dashboards and reports.
- [ ] Real export endpoints.
- [ ] Loss exception workflow completion.
- [ ] Automated accessibility tests.

## Verification Evidence

Last local verification date: 2026-06-05.

| Command | Result | Notes |
|---|---|---|
| `corepack pnpm --dir apps/worker test -- mock-adapters fabric-env` | Passed | Covers worker Fabric env validation and gateway-mode mock-anchor guard. |
| `corepack pnpm --dir apps/api test -- fabric-env integration-status` | Passed | Covers API Fabric env validation and status redaction. |
| `go version` | Blocked | Go is not installed locally, so `chaincode/audit-anchor-go` tests could not be executed in this environment. |
| `powershell -NoProfile -ExecutionPolicy Bypass -File infra\fabric\scripts\check-prereqs.ps1 -ReportOnly -AllowMissingFabricSamples` | Passed with blockers | Script runs and reports Docker, Git, and Bash available; Go and Fabric samples test-network are missing locally. |
| `powershell -NoProfile -ExecutionPolicy Bypass -File infra\fabric\scripts\check-prereqs.ps1` | Blocked | Fails on missing Go and `infra\fabric\.local\fabric-samples\test-network\network.sh`. Blocker type: local tooling/runtime material. |
| `powershell -NoProfile -ExecutionPolicy Bypass -File infra\fabric\scripts\start-local-network.ps1` | Blocked | Fails during prerequisite check before any Fabric network startup. Blocker type: local tooling/runtime material. |
| `corepack pnpm --dir apps/worker add @hyperledger/fabric-gateway @grpc/grpc-js` | Passed with local tooling warning | Dependencies were added, but optional native `pkcs11js` install failed because the Windows environment lacks the Visual C++ toolset. This blocks optional native/HSM validation only; the Gateway SDK dependency is present. |
| `corepack pnpm --dir apps/worker test -- fabric` | Passed | Covers hash-only Fabric payload construction, deterministic anchor IDs, Gateway adapter metadata mapping, and retryable/non-retryable Gateway failure classification. |
| `corepack pnpm --dir apps/worker test -- mock-adapters fabric-env` | Passed | Covers worker Fabric env validation and legacy mock adapter behavior after the registry split. |
| `corepack pnpm --dir apps/worker test -- fabric mock-adapters fabric-env` | Passed | 14 worker tests passed across Fabric payload, Gateway adapter, registry, mock adapter, and env config coverage. |
| `corepack pnpm prisma:generate` | Passed | Regenerated Prisma client after adding `AuditAnchor` Fabric metadata fields. |
| `corepack pnpm lint` | Passed | Repository lint completed. |
| `corepack pnpm typecheck` | Passed | Web TypeScript project references completed. |
| `corepack pnpm --dir apps/worker build` | Passed | Worker Nest build validates the Gateway adapter imports and wiring. |
| `corepack pnpm test` | Passed | Web, API, worker, config, and shared package tests completed. |
| `corepack pnpm build` | Passed | Web, API, and worker production builds completed. |
| `docker compose -f docker-compose.prod.yml --env-file .env.production.example config` | Passed | Production compose config renders with mock Fabric defaults and the API/worker read-only Fabric secret mount. |
| `corepack pnpm test:e2e` | Passed | 17/17 Playwright tests passed against clean E2E database, including migration `20260605000000_audit_anchor_fabric_metadata`. |
| `git diff --check` | Passed | No whitespace errors in the current implementation diff. |
| `corepack pnpm --dir apps/web test -- --run integrations` | Passed | Covers Fabric runtime status mapping and integration status cards. |
| `corepack pnpm exec playwright test tests/e2e/13-integrations-outbox-control.spec.ts` | Passed | Confirms the Fabric runtime mode card appears on the Integrations route. |

Note: real Fabric Gateway integration tests were not run because no real Fabric
network, deployed channel/chaincode, MSP identity, TLS material, or exported
Gateway connection material is available yet.

Browser plugin note: the in-app browser handle was unavailable in this session,
so the rendered-route check was performed through Playwright against the local
web app instead.
