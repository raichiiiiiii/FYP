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
| 2 | Fabric chaincode and local test network | Not complete. | Blocked by chaincode contract implementation, local Fabric network setup, and Fabric toolchain. |
| 3 | Worker real Fabric Gateway adapter | Partially complete. Gateway mode now blocks mock anchor success. | Real Fabric Gateway SDK adapter remains required. |
| 4 | Fabric metadata API and status model | Partially complete. API exposes Fabric mode/config status without leaking secret values. | Real anchor metadata, verification metadata, and schema/API updates remain required. |
| 5 | Evidence, audit, and hash verification workflow | Partially complete from prior audit/evidence work. | Needs real Gateway transaction/chaincode verification once adapter exists. |
| 6 | Graph UI Fabric anchor overlay | Not complete. | Needs backend read model for anchor/hash nodes and permission-filtered overlay data. |
| 7 | Integrations and operations Gateway mode UI | Partially complete. Backend status support and frontend Fabric mode/status card exist. | Worker health heartbeat remains required. |
| 8 | Unit test expansion | Partially complete. Config, API status, and gateway-mode mock-guard tests exist. | Adapter, graph overlay, verification-helper, and permission-label tests remain required. |
| 9 | Integration test expansion | Not complete. | Requires local Fabric test network or gated CI service. |
| 10 | Browser E2E and screenshot documentation | Partially complete. E2E now confirms the Fabric runtime card on the Integrations route. | Graph overlay E2E, screenshot documentation, and seeded real/mock anchor states remain required. |
| 11 | UAT testing | Not complete. | Requires stable demo data, UAT scripts, and clear mock-vs-real Gateway instructions. |
| 12 | CI, deployment, and release readiness | Partially complete from existing CI/deployment docs. | Needs optional gated Fabric integration workflow and Azure VM secret-mount instructions. |
| 13 | Post-demo product hardening | Not complete. | Requires product hardening backlog execution. |

## Blockers

| ID | Phase | Area | Blocker | Impact | Proposed resolution | Owner | Status |
|---|---|---|---|---|---|---|---|
| FG-001 | 2 | Fabric chaincode | No chaincode contract exists for hash-only audit anchors. | Real Fabric anchoring cannot be implemented or tested. | Implement and test an `AuditAnchor` chaincode contract that stores hashes, entity references, submitter metadata, and timestamps only. | Integrations | Open |
| FG-002 | 2 | Fabric local network | No local Fabric test network or deployment script is committed. | Gateway adapter and integration tests have no target. | Add local Fabric test-network instructions/scripts with generated test certificates outside committed secrets. | Integrations / Operations | Open |
| FG-003 | 3 | Worker adapter | Real Fabric Gateway SDK adapter is not implemented. | Gateway mode cannot submit anchors; worker correctly refuses mock success in gateway mode. | Add Fabric SDK dependency and implement adapter behind the current outbox dispatch boundary. | Integrations | Open |
| FG-004 | 3 | Idempotency | Gateway submit idempotency behavior is not designed. | Retried outbox events could duplicate chaincode writes if adapter is added naively. | Use outbox idempotency keys and deterministic anchor IDs in chaincode and worker adapter. | Integrations | Open |
| FG-005 | 4 | Database metadata | Current anchor schema is sufficient for mock anchors but not fully modeled for real submit/commit/verify lifecycle. | API cannot show complete real Gateway evidence. | Add migration-backed fields or metadata shaping for transaction ID, block number, commit status, chaincode name, channel, and verification timestamp. | Evidence / Audit | Open |
| FG-006 | 5 | Hash canonicalization docs | Reviewer-facing hash explanation lacks final canonicalization detail from backend. | Verification UX may be underspecified for auditors. | Document canonical hash input format and align API/helper tests. | Evidence / Audit | Open |
| FG-007 | 6 | Graph anchor overlay data | Backend graph read model does not expose anchor/hash overlay nodes. | Graph cannot visualize Fabric/evidence relationships. | Extend graph read model with permission-filtered anchor/hash nodes and edges. | Graph / Evidence | Open |
| FG-008 | 7 | Worker health | Worker has no health heartbeat/status endpoint. | Operations UI cannot distinguish idle, stopped, degraded, and unavailable worker states. | Add worker heartbeat table or API health endpoint and surface it in operations UI. | Operations | Open |
| FG-009 | 7 | Gateway UI card | Frontend did not render the Fabric mode/status endpoint. | Reviewers previously had to inspect API/docs to see mock vs gateway mode. | Added Integrations Fabric card using `GET /api/v1/integrations/fabric/status`. | Integrations UI | Closed |
| FG-010 | 9 | Real integration tests | No gated real Fabric integration test environment exists. | CI cannot prove real Gateway anchoring. | Add optional CI job gated by Fabric secrets or run local Fabric network in integration tests. | QA / Operations | Open |
| FG-011 | 10 | E2E evidence states | Browser tests cannot cover real verified Fabric state without real adapter or controlled fixture endpoint. | UI screenshot documentation remains limited to mock/pending/failed states. | Add seeded mock and real-mode test cases once API model and adapter exist. | QA | Open |
| FG-012 | 11 | UAT instructions | UAT materials do not yet include real Gateway setup and evidence capture. | Reviewers may confuse mock prototype state with real Fabric verification. | Update UAT checklist with environment mode, transaction ID, chaincode, and verification evidence fields. | QA / Product | Open |
| FG-013 | 12 | Azure VM secrets | Azure VM secret mounting is documented and Compose mounts `deploy/fabric` read-only into API/worker. GitHub Actions secret handling for Fabric materials is not implemented. | Gateway mode has a documented VM file-mount path, but automated secret delivery remains blocked. | Add GitHub Actions or external secret-manager handling for Fabric materials when real Gateway deployment is ready. | Operations | Partial |
| FG-014 | 13 | Product hardening | Real OIDC, report exports, loss exception workflow, and accessibility automation remain outside the Fabric slice. | Demo can proceed with caveats, but production readiness is incomplete. | Track these in post-demo hardening backlog with owners and acceptance tests. | Product / Engineering | Open |

## TODO Checklist

### Phase 2 - Fabric Chaincode And Test Network

- [ ] Define chaincode package location and language.
- [ ] Implement hash-only audit anchor chaincode.
- [ ] Add chaincode unit tests.
- [ ] Add local Fabric test network instructions.
- [ ] Ensure generated certs, keys, ledgers, and channel artifacts are ignored.

### Phase 3 - Worker Real Gateway Adapter

- [x] Prevent gateway mode from returning mock anchor success.
- [ ] Add Fabric Gateway SDK dependency.
- [ ] Implement adapter using configured MSP, cert, key, TLS cert, channel, and chaincode.
- [ ] Preserve outbox retry behavior for Gateway failures.
- [ ] Persist reconciliation records for submitted, committed, failed, and unavailable states.
- [ ] Add adapter unit tests with mocked SDK client.

### Phase 4 - API Status And Metadata

- [x] Add API Fabric mode/configuration status summary.
- [ ] Add schema/API shape for real Gateway transaction metadata.
- [ ] Add API tests for submitted, committed, verified, failed, mock, and unavailable states.
- [ ] Confirm no secret path, endpoint, private key, or certificate body leaks through API responses.

### Phase 5 - Evidence And Audit Verification

- [ ] Add reviewer-facing canonical hash explanation.
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
- [ ] Link operations screen to deployment runbook.

### Phase 8 - Unit Tests

- [x] Cover API and worker Fabric env config readers.
- [x] Cover worker gateway-mode mock guard.
- [x] Cover API Fabric status redaction.
- [x] Cover frontend Fabric status card.
- [ ] Cover real Gateway adapter with mocked SDK.
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
- [ ] Add UAT evidence package template.
- [ ] Add tester instructions for mock vs gateway mode.

### Phase 12 - CI, Deployment, Release Readiness

- [ ] Add optional gated Fabric integration CI job.
- [x] Add Azure VM Fabric secret-mount documentation.
- [ ] Add GitHub Actions or external secret-manager handling for Fabric cert/key material.
- [ ] Add release note separating demo mock mode from real Gateway readiness.

### Phase 13 - Post-Demo Hardening

- [ ] Production OIDC and invitation flow.
- [ ] Worker health endpoint.
- [ ] Backend summary DTOs for dashboards and reports.
- [ ] Real export endpoints.
- [ ] Loss exception workflow completion.
- [ ] Automated accessibility tests.

## Verification Evidence

Last local verification date: 2026-06-04.

| Command | Result | Notes |
|---|---|---|
| `corepack pnpm --dir apps/worker test -- mock-adapters fabric-env` | Passed | Covers worker Fabric env validation and gateway-mode mock-anchor guard. |
| `corepack pnpm --dir apps/api test -- fabric-env integration-status` | Passed | Covers API Fabric env validation and status redaction. |
| `corepack pnpm lint` | Passed | Repository lint completed. |
| `corepack pnpm typecheck` | Passed | Web TypeScript project references completed. |
| `corepack pnpm test` | Passed | Web, API, worker, config, and shared package tests completed. |
| `corepack pnpm build` | Passed | Web, API, and worker production builds completed. |
| `docker compose -f docker-compose.prod.yml --env-file .env.production.example config` | Passed | Production compose config renders with mock Fabric defaults and the API/worker read-only Fabric secret mount. |
| `corepack pnpm test:e2e` | Passed | 17/17 Playwright tests passed against clean E2E database. |
| `corepack pnpm --dir apps/web test -- --run integrations` | Passed | Covers Fabric runtime status mapping and integration status cards. |
| `corepack pnpm exec playwright test tests/e2e/13-integrations-outbox-control.spec.ts` | Passed | Confirms the Fabric runtime mode card appears on the Integrations route. |

Note: real Fabric Gateway integration tests were not run because no real Fabric
network, channel, chaincode, MSP identity, TLS material, or Gateway adapter is
available yet.

Browser plugin note: the in-app browser handle was unavailable in this session,
so the rendered-route check was performed through Playwright against the local
web app instead.
