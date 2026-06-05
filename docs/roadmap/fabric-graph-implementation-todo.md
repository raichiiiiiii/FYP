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
| 2 | Fabric chaincode and local test network | Complete for local proof. Go `audit-anchor` chaincode source, pure unit tests, Fabric build-tag wrapper validation, local test-network plan, PowerShell wrappers, Gateway material export helper, artifact ignore policy, deployed local network containers, and local Gateway env material exist. | Production consortium topology and managed secret delivery remain outside this local test-network slice. |
| 3 | Worker real Fabric Gateway adapter | Complete for repository and local Gateway proof. `apps/worker` has a Fabric Gateway SDK adapter selected by `FABRIC_MODE=gateway`, mock mode remains isolated, deterministic anchor IDs are derived from idempotency keys, mocked Gateway unit tests cover hash-only payloads and failure classification, and the gated worker integration test passed against the local Fabric Gateway env including duplicate same-hash coverage. | None for worker adapter proof. |
| 4 | Fabric metadata API and status model | Complete for repository implementation. API exposes Fabric mode/config status without leaking secret values, `AuditAnchor` has nullable real Gateway metadata fields, worker anchor persistence stores those fields when present, hash-record anchor status returns typed Fabric metadata, and `GET /api/v1/hash-records/:id/fabric-verification` now performs API-side `ReadAnchor` verification when Gateway mode is configured. | Real deployed verification still requires VM Gateway material and reachable Fabric runtime. |
| 5 | Evidence, audit, and hash verification workflow | Complete for repository implementation. Hash-record Fabric verification distinguishes mock, pending, failed, unavailable, anchored-but-not-fully-verified, local hash mismatch, on-chain not found, on-chain mismatch, and real verified states. Stored metadata alone can no longer return `verified=true`. | Reviewer screenshots require a live Gateway hash record id. |
| 6 | Graph UI Fabric anchor overlay | Complete for repository read-model, UI mapping, E2E role-filtering coverage, and screenshot automation. Backend project graph now emits permission-filtered `HashRecord` and `AuditAnchor` nodes plus `verifies` and `anchors` edges; frontend graph model, filters, legends, and styles understand `hash_record`, `anchor`, `verifies`, and `anchors`. | None for repository graph overlay. |
| 7 | Integrations and operations Gateway mode UI | Complete for repository-visible runtime status. Backend status support, frontend Fabric mode/status card, DB-backed worker heartbeat, API worker status, and Operations UI worker heartbeat table exist. | Real external adapter health probes still require provider/runtime integration. |
| 8 | Unit test expansion | Complete for the current repository scope. Config, API status, gateway-mode mock-guard, Gateway adapter, payload builder, adapter registry, API-side `ReadAnchor` query client, hash-record verification, dashboard summary, and graph overlay tests exist. | None for repository unit coverage. |
| 9 | Integration test expansion | Complete for the current repository scope. Default worker integration tests remain mock-safe, the Fabric-pattern integration command passes with the real Gateway spec skipped when the local test-network flag is unset, and the gated `FABRIC_TEST_NETWORK_ENABLED=true` real Gateway integration spec is available for local Fabric proof. | Real Gateway execution still depends on local/VM Fabric runtime material. |
| 10 | Browser E2E and screenshot documentation | Complete for repository coverage. Full Playwright E2E passed with Fabric runtime card coverage, hash-detail reviewer states, graph anchor overlay role filtering, backend workflow bypass checks, and a gated real Gateway UAT screenshot flow. A live Azure VM hash record was created for proof capture, but worker anchoring exhausted 5 attempts with `FABRIC_UNAVAILABLE` and `ECONNREFUSED 127.0.0.1:7051`. | Real Gateway screenshots require resolving deployed Fabric peer/gateway reachability and obtaining `verified=true` from `ReadAnchor`. Seeded transaction IDs remain test evidence only. |
| 11 | UAT testing | Partially complete. Fabric mode/evidence fields, evidence package template, and mock-vs-gateway tester instructions exist. | Formal reviewer-led UAT execution remains required. |
| 12 | CI, deployment, and release readiness | Complete for repository implementation and VM deployment evidence. Azure VM deploy workflow materializes Fabric Gateway secrets from existing repository secrets, validates secret files, composes with generated Gateway env, runs smoke checks, and sanitized evidence shows the deployed stack healthy with Gateway mode configured. | Real hash-record proof remains blocked by deployed Fabric runtime availability, not by deployment evidence collection. |
| 13 | Post-demo product hardening | Complete for tracking. Product-hardening backlog and secret-management ADR exist. | Execution of hardening backlog remains post-demo work. |

## Blockers

| ID | Phase | Area | Blocker | Impact | Proposed resolution | Owner | Status |
|---|---|---|---|---|---|---|---|
| FG-001 | 2 | Fabric chaincode | Go `audit-anchor` chaincode source, pure unit tests, Fabric Contract API wrapper, and executable chaincode entrypoint exist under `chaincode/audit-anchor-go/`. `go test ./...` and `go test -tags fabric ./...` passed after Go was made available in the command PATH. | Local chaincode validation is proven. | Keep closed for local chaincode validation. | Integrations | Closed |
| FG-002 | 2 | Fabric local network | Local Fabric test-network PowerShell wrappers and Gateway material export helper are committed under `infra/fabric/`. `check-prereqs.ps1` passed, the local Fabric CA/peer/orderer network started, `audit-anchor` deployed on channel `mepn-audit`, and `infra/fabric/.local/fabric-gateway.env` was exported. | Local Gateway execution target is proven. | Keep closed for local test-network proof; continue production deployment and secret delivery separately. | Integrations / Operations | Closed |
| FG-003 | 3 | Worker adapter | Real Fabric Gateway SDK adapter is implemented behind the worker outbox adapter registry. `FABRIC_MODE=mock` uses the mock adapter; `FABRIC_MODE=gateway` uses the Gateway adapter and never returns mock success. The adapter loads configured cert/key/TLS material, submits `CreateAnchor`, returns SDK transaction metadata only when supplied, and maps configuration/unavailable/validation failures. The gated worker integration test passed against local Gateway material. | Worker Gateway submission is proven locally without fabricating success. | Keep closed for worker adapter proof; continue duplicate/idempotency and chaincode unit validation separately. | Integrations | Closed |
| FG-004 | 3 | Idempotency | Worker Gateway payloads now derive `idempotencyKey = fabric:{organizationId || global}:{entityType}:{entityId}:{canonicalHash}` when absent and `anchorId = sha256(idempotencyKey)`. Chaincode reconciles duplicate same-anchor/same-hash submissions by returning the existing anchor. The gated real Fabric integration spec includes duplicate same-hash submission coverage and passed against the local Fabric network. | Deterministic worker-side and real-network duplicate behavior are covered for the local Gateway slice. | Keep closed for local idempotency proof. | Integrations | Closed |
| FG-005 | 4 | Database metadata | `AuditAnchor` now has migration-backed nullable fields for transaction ID, block number, channel, chaincode, commit status, endorsement status, and verification timestamp. Hash-record anchor status and the Fabric verification endpoint expose these fields without reporting mock anchors as verified. | API can represent and evaluate real Gateway metadata when a real adapter supplies it. | Keep closed for schema/API shape; continue direct chaincode query work as a separate API-side verification slice. | Evidence / Audit | Closed |
| FG-006 | 5 | Hash canonicalization docs | Reviewer-facing hash explanation lacked canonicalization detail from backend. | Verification UX was underspecified for auditors. | Added canonical hash verification guide based on `AuditHashService` behavior. | Evidence / Audit | Closed |
| FG-007 | 6 | Graph anchor overlay data | Backend graph read model exposes `HashRecord` and `AuditAnchor` nodes only for already-visible source records, adds `verifies` and `anchors` edges, and prunes edges whose endpoints are hidden. Frontend mapping, filters, legend, tests, Playwright E2E role checks, and screenshot automation support the overlay. | Graph can visualize Fabric/evidence relationships without exposing finance anchors when finance source records are hidden. | Keep closed for repository graph overlay. Seeded E2E transaction IDs must not be presented as real Gateway proof. | Graph / Evidence | Closed |
| FG-008 | 7 | Worker health | `WorkerHeartbeat` is migration-backed. The outbox worker records starting/running/idle/disabled heartbeats and processed/failed counts. API exposes `/api/v1/integrations/workers`, and Operations UI classifies recent, stale, disabled, and degraded queue states. | Operations UI can distinguish configured worker heartbeat states instead of inferring worker health from API process health alone. | Keep closed for repository heartbeat/status. Continue real provider health probes separately. | Operations | Closed |
| FG-009 | 7 | Gateway UI card | Frontend did not render the Fabric mode/status endpoint. | Reviewers previously had to inspect API/docs to see mock vs gateway mode. | Added Integrations Fabric card using `GET /api/v1/integrations/fabric/status`. | Integrations UI | Closed |
| FG-010 | 9 | Real integration tests | A gated real Fabric Gateway worker integration test exists and is skipped by default. When enabled with local Gateway env/material, it submits a hash-only anchor, checks reconciliation/audit anchor metadata, and queries `ReadAnchor` for the on-chain hash. Local execution passed after loading `infra/fabric/.local/fabric-gateway.env` and setting `FABRIC_TEST_NETWORK_ENABLED=true`. | CI/default tests remain deterministic, and local real Gateway worker proof now exists. | Keep closed for worker Gateway integration proof. Add API/graph integration tests separately. | QA / Operations | Closed |
| FG-011 | 10 | E2E evidence states | Browser E2E exercises hash-detail Fabric verification states, graph anchor overlay role filtering, and backend workflow bypass checks. A gated real Gateway UAT spec captures proof screenshots only when a live Gateway hash record id is supplied. A live Azure VM hash record was created, but API verification returned `FABRIC_UNAVAILABLE`, `verified=false`, and no transaction/on-chain hash metadata. Outbox/reconciliation shows 5 worker attempts failed with `ECONNREFUSED 127.0.0.1:7051`. | Real Gateway screenshot artifacts cannot be captured until the deployed Fabric runtime produces a real anchor and `ReadAnchor` verifies it. | Fix the deployed `FABRIC_PEER_ENDPOINT`/peer reachability so it is not loopback from inside the worker container unless a real peer is running there; then rerun verification for hash record `4b82c6b9-4ba0-4915-8d2b-b35331d0f4d3` before running the gated UAT spec. | QA / Operations | Blocked |
| FG-012 | 11 | UAT instructions | UAT materials previously lacked real Gateway setup and evidence capture fields. | Reviewers could confuse mock prototype state with real Fabric verification. | Added Fabric mode/evidence fields, UAT evidence package template, and mock-vs-gateway tester instructions. | QA / Product | Closed |
| FG-013 | 12 | Azure VM secrets | Azure VM secret delivery is implemented in GitHub Actions using the existing repository secret names. Scripts write `/run/secrets/fabric`, validate files without printing contents, mount them read-only into API/worker, and run sanitized smoke checks. GitHub Actions run `27043095990` produced sanitized deployment evidence, and run `27043773435` redeployed the current proof-readiness commit successfully. | Secret delivery and deployment evidence are complete for the FYP VM demo path. | Keep closed for VM secret delivery. Continue live Gateway proof under FG-011. | Operations | Closed |
| FG-014 | 13 | Product hardening | Real OIDC, report exports, loss exception workflow, accessibility automation, backup/restore, Gateway credential rotation, production monitoring, and UAT evidence packaging are tracked in `docs/roadmap/product-hardening-backlog.md`; secret-management ADR exists. | Production readiness remains incomplete by design for FYP demo. | Execute the hardening backlog as separate product slices with owners and acceptance tests. | Product / Engineering | Closed |

## TODO Checklist

### Phase 2 - Fabric Chaincode And Test Network

- [x] Define chaincode package location and language.
- [x] Implement hash-only audit anchor chaincode.
- [x] Add chaincode unit tests.
- [x] Run chaincode unit tests after Go is installed locally or in CI.
- [x] Validate Fabric Contract API wrapper with the `fabric` build tag after Fabric dependency/toolchain setup.
- [x] Add local Fabric test network instructions.
- [x] Add local Fabric test network start/stop scripts.
- [x] Add local Gateway material export helper.
- [x] Execute local Fabric test network scripts after Fabric samples and Go are installed.
- [x] Ensure generated certs, keys, ledgers, and channel artifacts are ignored.

### Phase 3 - Worker Real Gateway Adapter

- [x] Prevent gateway mode from returning mock anchor success.
- [x] Add Fabric Gateway SDK dependency.
- [x] Implement adapter using configured MSP, cert, key, TLS cert, channel, and chaincode.
- [x] Preserve outbox retry behavior for Gateway failures.
- [x] Persist reconciliation records for anchored, failed, configuration-error, and unavailable states.
- [x] Add adapter unit tests with mocked SDK client.
- [x] Prove real Gateway submission against the local Fabric test network.

### Phase 4 - API Status And Metadata

- [x] Add API Fabric mode/configuration status summary.
- [x] Add schema/API shape for real Gateway transaction metadata.
- [x] Add safe stored-metadata Fabric verification endpoint for hash records.
- [x] Add API tests for verified, failed, mock, pending, unavailable, anchored-without-chaincode-query, and local hash mismatch states.
- [x] Add direct chaincode query verification after API-side Gateway query strategy is implemented.
- [x] Confirm no secret path, endpoint, private key, or certificate body leaks through API responses.

### Phase 5 - Evidence And Audit Verification

- [x] Add reviewer-facing canonical hash explanation.
- [ ] Add direct audit-event detail links from Gateway verification records where source routes exist.
- [x] Show real transaction/chaincode references only when backend evidence exists.
- [x] Add tests for every Fabric anchor display state.

### Phase 6 - Graph Overlay

- [x] Extend graph DTO with anchor/hash nodes and evidence edges.
- [x] Add permission filtering for anchor context.
- [x] Add graph overlay legend and selected-node details.
- [x] Add graph tests proving unauthorized finance/evidence nodes remain hidden.

### Phase 7 - Integrations And Operations UI

- [x] Add frontend API hook for Fabric status endpoint.
- [x] Add Fabric status card showing mock, gateway, degraded, unavailable, pending, and retrying states.
- [x] Add worker heartbeat/queue status support.
- [x] Link operations screen to deployment runbook.

### Phase 8 - Unit Tests

- [x] Cover API and worker Fabric env config readers.
- [x] Cover worker gateway-mode mock guard.
- [x] Cover API Fabric status redaction.
- [x] Cover frontend Fabric status card.
- [x] Cover real Gateway adapter with mocked SDK.
- [x] Cover graph overlay mapper and permission labels.

### Phase 9 - Integration Tests

- [x] Add mock-mode worker/outbox integration tests.
- [x] Add gated real Fabric integration tests.
- [x] Add gated duplicate same-hash real Fabric integration assertion.
- [x] Rerun gated duplicate same-hash assertion after restarting local Fabric.
- [x] Add API tests for anchor status and chaincode verification outcomes.
- [x] Add graph E2E tests for anchor overlay and role filtering.

### Phase 10 - Browser E2E And Screenshots

- [x] Add Playwright flow for Fabric status card.
- [x] Add Playwright flow for hash-detail Fabric evidence states.
- [x] Add Playwright flow for graph anchor overlay.
- [x] Add screenshot automation for graph overlay and real Gateway proof panel.
- [x] Ensure screenshots never label mock anchors as real verified Fabric.

### Phase 11 - UAT

- [x] Update UAT checklist with Fabric mode and verification evidence fields.
- [x] Add UAT evidence package template.
- [x] Add tester instructions for mock vs gateway mode.

### Phase 12 - CI, Deployment, Release Readiness

- [x] Add optional gated Fabric integration CI job.
- [x] Add Azure VM Fabric secret-mount documentation.
- [x] Add GitHub Actions or external secret-manager handling for Fabric cert/key material.
- [x] Add release note separating demo mock mode from real Gateway readiness.

### Phase 13 - Post-Demo Hardening

- [x] Create post-demo product hardening backlog.
- [ ] Production OIDC and invitation flow.
- [x] Worker health endpoint.
- [x] Backend summary DTO for dashboard.
- [ ] Backend summary DTOs for reports.
- [ ] Real export endpoints.
- [ ] Loss exception workflow completion.
- [ ] Automated accessibility tests.

## Verification Evidence

Last local verification date: 2026-06-05.

| Command | Result | Notes |
|---|---|---|
| `corepack pnpm --dir apps/worker test -- mock-adapters fabric-env` | Passed | Covers worker Fabric env validation and gateway-mode mock-anchor guard. |
| `corepack pnpm --dir apps/api test -- fabric-env integration-status` | Passed | Covers API Fabric env validation and status redaction. |
| `go version` | Passed | `go version go1.26.4 windows/amd64` after prepending `C:\Program Files\Go\bin` to the command PATH. |
| `go test ./...` from `chaincode/audit-anchor-go` | Passed | Pure chaincode validation passed. |
| `go test -tags fabric ./...` from `chaincode/audit-anchor-go` | Passed | Fabric Contract API wrapper validation passed. |
| `powershell -NoProfile -ExecutionPolicy Bypass -File infra\fabric\scripts\check-prereqs.ps1` | Passed | Docker, Git, Bash, Go, and Fabric samples test-network were available. |
| `powershell -NoProfile -ExecutionPolicy Bypass -File infra\fabric\scripts\start-local-network.ps1` | Passed | Local Fabric network started, channel `mepn-audit` was created, and `audit-anchor` was deployed. Script emitted non-fatal Docker volume cleanup messages for already-removed volumes. |
| `docker ps` | Passed | Local Fabric CA, peer, orderer, and `audit-anchor` chaincode containers were observed running, along with MEPN PostgreSQL, Redis, and MinIO containers. |
| `corepack pnpm --dir apps/worker add @hyperledger/fabric-gateway @grpc/grpc-js` | Passed with local tooling warning | Dependencies were added, but optional native `pkcs11js` install failed because the Windows environment lacks the Visual C++ toolset. This blocks optional native/HSM validation only; the Gateway SDK dependency is present. |
| `corepack pnpm --dir apps/worker test -- fabric` | Passed | Covers hash-only Fabric payload construction, deterministic anchor IDs, Gateway adapter metadata mapping, and retryable/non-retryable Gateway failure classification. |
| `corepack pnpm --dir apps/worker test -- mock-adapters fabric-env` | Passed | Covers worker Fabric env validation and legacy mock adapter behavior after the registry split. |
| `corepack pnpm --dir apps/worker test -- fabric mock-adapters fabric-env` | Passed | 14 worker tests passed across Fabric payload, Gateway adapter, registry, mock adapter, and env config coverage. |
| `corepack pnpm --dir apps/api test -- hash-records fabric-env integration-status` | Passed | Covers hash-record Fabric verification states, API Fabric env validation, and updated Gateway adapter status reporting. |
| `corepack pnpm --dir apps/api test -- graph` | Passed | Covers backend graph hash/anchor overlay and finance-role leakage prevention. |
| `corepack pnpm --dir apps/web test -- --run graph` | Passed | Covers frontend graph mapping, role filtering, legends, filters, and hash/anchor overlay relationships. |
| `corepack pnpm prisma:generate` | Passed | Regenerated Prisma client after adding `WorkerHeartbeat`. |
| `corepack pnpm --dir apps/worker test -- heartbeat` | Passed | Covers outbox worker heartbeat writes for idle and successful processing runs. |
| `corepack pnpm --dir apps/api test -- integration-status` | Passed | Covers Fabric status and worker heartbeat health classification. |
| `corepack pnpm --dir apps/web test -- --run integrations` | Passed | Covers integration/operations status model including worker heartbeat and Fabric runtime card. |
| `corepack pnpm --dir apps/worker test:integration` | Passed | Default worker integration suite passed with the real Fabric Gateway spec skipped. |
| `corepack pnpm --dir apps/worker test:integration -- fabric` | Passed | Fabric-pattern integration command passed with the real Gateway spec skipped while `FABRIC_TEST_NETWORK_ENABLED` was unset. |
| `FABRIC_TEST_NETWORK_ENABLED=true` with `infra\fabric\.local\fabric-gateway.env`; `corepack pnpm --dir apps/worker test:integration -- fabric` | Passed | Both worker Fabric integration suites passed. The real Gateway test submitted a hash-only anchor, persisted reconciliation/audit metadata, and queried `ReadAnchor` for the on-chain hash. |
| `FABRIC_TEST_NETWORK_ENABLED=true` with duplicate same-hash assertion; `corepack pnpm --dir apps/worker test:integration -- fabric` | Passed | The gated worker test submitted a duplicate same-anchor/same-hash command and verified the reconciled on-chain anchor. |
| `node tests/e2e/setup-e2e.mjs; corepack pnpm exec playwright test tests/e2e/14-fabric-evidence-states.spec.ts` | Passed | Covers hash-detail Fabric verification states using API-created hash records plus seeded mock, pending, failed, unavailable, anchored-not-fully-verified, and stored-metadata verified evidence. |
| `corepack pnpm prisma:generate` | Passed | Regenerated Prisma client after adding `AuditAnchor` Fabric metadata fields. |
| `corepack pnpm lint` | Passed | Repository lint completed. |
| `corepack pnpm typecheck` | Passed | Web TypeScript project references completed. |
| `corepack pnpm --dir apps/worker build` | Passed | Worker Nest build validates the Gateway adapter imports and wiring. |
| `corepack pnpm test` | Passed | Web, API, worker, config, and shared package tests completed. |
| `corepack pnpm build` | Passed | Web, API, and worker production builds completed. |
| `docker compose -f docker-compose.prod.yml --env-file .env.production.example config` | Passed | Production compose config renders with mock Fabric defaults and the API/worker read-only Fabric secret mount. |
| `corepack pnpm test:e2e` | Passed | 20 Playwright tests passed and 1 gated real Gateway UAT screenshot test was skipped because `FABRIC_GATEWAY_UAT_HASH_RECORD_ID` was unset. Covers hash-detail Fabric evidence states, graph overlay role filtering, backend workflow bypass checks, and migration `20260605001000_worker_heartbeat`. |
| `git diff --check` | Passed | No whitespace errors in the current implementation diff. |
| `corepack pnpm --dir apps/web test -- --run integrations` | Passed | Covers Fabric runtime status mapping and integration status cards. |
| `corepack pnpm exec playwright test tests/e2e/13-integrations-outbox-control.spec.ts` | Passed | Confirms the Fabric runtime mode card appears on the Integrations route. |
| `corepack pnpm --dir apps/worker test:integration -- fabric` | Passed | 1 integration suite passed and the gated real Gateway suite skipped while `FABRIC_TEST_NETWORK_ENABLED` was unset. |
| `docker compose -f docker-compose.prod.yml --env-file .env.production.example config` | Passed | Production Compose renders with mock defaults and API/worker read-only `/run/secrets/fabric` mounts. |
| `bash -n scripts/deploy/write-fabric-secrets-on-vm.sh scripts/validate-fabric-secrets.sh scripts/smoke/fabric-gateway-smoke.sh scripts/evidence/collect-vm-deployment-evidence.sh` | Passed | Deployment, validation, smoke, and evidence scripts parse cleanly. |
| `bash scripts/validate-fabric-secrets.sh /tmp/mepn-fabric-secret-test-codex` with placeholder files | Passed | Placeholder dry run validated required Fabric file layout and env keys without printing file contents. |

Additional UAT evidence is recorded in
`docs/testing/uat-fabric-infrastructure-evidence-2026-06-05.md`.

Note: local chaincode validation, local Fabric network startup/deploy, worker
Gateway integration proof, API-side chaincode verification logic, graph overlay
E2E, backend workflow bypass tests, and Azure VM deployment evidence are now
available. Reviewer real Gateway screenshots still require a live deployed
Gateway hash record that returns `verified=true` from `ReadAnchor`; the latest
Azure VM proof attempt returned `FABRIC_UNAVAILABLE` after the worker tried
`127.0.0.1:7051` and received `ECONNREFUSED`.

Browser plugin note: the in-app browser handle was unavailable in this session,
so the rendered-route check was performed through Playwright against the local
web app instead.
