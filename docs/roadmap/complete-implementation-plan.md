# MEPN Complete Roadmap Implementation Plan

## Purpose

This plan consolidates `docs/roadmap/` into an executable implementation
sequence. It covers the module roadmap, the read-only project graph feature,
the integration outbox control panel, and the Fabric Gateway / graph / testing /
UAT integration roadmap.

The plan preserves the repository source-of-truth order and keeps Figma Make as
visual reference only.

## Current Baseline

| Area | Current state |
| --- | --- |
| Module ownership | Defined by `docs/roadmap/module-roadmap.md` and ADR-013. |
| Graph/canvas | `/graph/projects` exists as a read-only, permission-filtered project graph. |
| Integrations | `/integrations` exists with outbox, mock adapter, reconciliation, retry visibility, and API Fabric mode status. |
| Fabric | Mock anchoring exists only in explicit mock mode; gateway mode blocks mock anchor success. Real Fabric Gateway is not implemented. |
| Evidence/audit | Hash records, audit timelines, evidence packs, and honest anchor states exist. |
| Testing | Unit/component tests and 17 Playwright E2E tests currently pass. |
| Deployment | Docker Compose deployment exists; Azure Student VM guide records prior smoke evidence. |

## Execution Rules

Every implementation phase must:

1. Fill or reference a module feature intake.
2. Preserve PostgreSQL as the operational source of truth.
3. Keep Fabric effects outbox-driven, idempotent, retryable, and reconcilable.
4. Keep mock mode available for local/dev/demo.
5. Avoid showing verified Fabric state without backend verification evidence.
6. Add or update tests before claiming completion.
7. Update docs when behavior or operational assumptions change.

## Phase 0 - Roadmap Baseline And Traceability

Status: Complete.

Deliverables:

- `docs/roadmap/module-roadmap.md`
- `docs/roadmap/features/graph-read-only-project-canvas.md`
- `docs/roadmap/features/integration-outbox-control-panel.md`
- `docs/roadmap/fabric-graph-ui-testing-plan.md`
- ADR-013

Acceptance:

- Every feature enters through one owning module.
- Graph and integrations features have feature intake records.
- Real Fabric work is separated from mock Fabric demo behavior.

## Phase 1 - Fabric Gateway ADR And Environment Contract

Status: Complete for ADR and environment-contract baseline.

Owning module:
Integrations.

Supporting modules:
Evidence and Audit, Graph/Canvas, Operations.

Deliverables:

- ADR-014 for real Fabric Gateway anchoring.
- Explicit Fabric environment contract.
- API and worker Fabric config readers.
- Config tests proving mock mode defaults and gateway mode validation.

Acceptance:

- Mock mode remains default.
- `FABRIC_ENABLED=true` implies gateway mode unless `FABRIC_MODE=mock` is set.
- Gateway mode refuses to start without identity, peer, channel, chaincode, and timeout configuration.
- No Fabric SDK dependency is added until the adapter phase.

## Phase 2 - Fabric Chaincode And Local Test Network Foundation

Owning module:
Integrations.

Deliverables:

- Chaincode contract for hash-only audit anchors.
- Local Fabric test network instructions.
- Test-only Fabric materials outside committed secrets.
- Chaincode tests for create/read/verify anchor behavior.

Acceptance:

- Chaincode stores hashes and minimum metadata only.
- No confidential procurement, finance, contract, invoice, or document payloads
  are written on-chain.
- Local test network can be started by developers without affecting demo mode.

## Phase 3 - Worker-Side Real Fabric Gateway Adapter

Status: Partially complete for safety guard only.

Owning module:
Integrations.

Deliverables:

- Fabric Gateway SDK dependency in the worker package.
- Gateway adapter implementing the same dispatch boundary as mock adapters.
- Idempotent submit behavior for `FABRIC_ANCHOR_REQUESTED`.
- Timeout and commit-status handling.
- Reconciliation records for submitted, committed, failed, and unavailable states.

Acceptance:

- Core workflows continue when Fabric is unavailable.
- Mock adapter remains selectable.
- Failed Fabric events retry through outbox.
- Real Gateway transaction IDs are never fabricated.

Current repository state:

- Worker mock adapter refuses to produce `ANCHORED_MOCK` when `FABRIC_MODE=gateway`.
- Real Fabric Gateway SDK adapter remains blocked until Fabric network, chaincode,
  identity material, and SDK implementation are available.

## Phase 4 - Fabric Metadata API And Status Model

Status: Partially complete for configuration status only.

Owning module:
Evidence and Audit.

Supporting modules:
Integrations, Graph/Canvas.

Deliverables:

- API status model for Fabric mode, availability, latest anchor state, and verification metadata.
- AuditAnchor and reconciliation response shaping.
- Health/status endpoint additions if required.
- Tests for pending, submitted, verified, failed, mock, and unavailable states.

Acceptance:

- API responses distinguish mock anchoring from real Gateway anchoring.
- UI consumers do not infer verification from incomplete metadata.
- Database schema changes are migration-backed if needed.

Current repository state:

- API exposes Fabric mode/configuration status without leaking gateway endpoint or
  credential path values.
- Latest anchor verification metadata and schema-backed real Gateway fields remain
  blocked until the adapter and chaincode are implemented.

## Phase 5 - Evidence, Audit, And Hash Verification Workflow

Owning module:
Evidence and Audit.

Deliverables:

- Hash detail view improvements for real Fabric references.
- Audit timeline wording for mock, pending, submitted, verified, failed, and unavailable states.
- Source-record links for hash/audit rows.
- Reviewer-safe verification explanation.

Acceptance:

- Verification requires canonical hash plus real Fabric transaction/chaincode evidence.
- Pending and failed anchors remain visible.
- Tests cover all anchor display states.

## Phase 6 - Graph UI Fabric Anchor Overlay

Owning module:
Graph/Canvas.

Supporting modules:
Evidence and Audit, Integrations.

Deliverables:

- Anchor node/edge/status mapping in project graph read model.
- Frontend graph filters for anchor visibility.
- Selected-node detail panel for anchor/hash/audit records.
- Permission filtering for finance and anchor context.

Acceptance:

- Unauthorized nodes and edges remain hidden.
- Anchor overlays are read-only.
- Clicking anchor/hash nodes opens source verification records.

## Phase 7 - Integrations And Operations Fabric Gateway Mode UI

Status: Partially complete for API and Integrations UI status support.

Owning module:
Integrations.

Supporting modules:
Operations.

Deliverables:

- Fabric mode card showing `mock`, `gateway`, `degraded`, `unavailable`, and retry states.
- Gateway configuration presence without leaking secrets.
- Outbox and reconciliation controls for Fabric events.
- Worker health caveat or heartbeat integration.

Acceptance:

- UI does not claim Gateway readiness unless configuration and health data prove it.
- Mock mode is labelled.
- Failed retries and idempotency keys remain visible.

Current repository state:

- Backend status support is available.
- The Integrations page renders Fabric runtime mode/configuration status without
  leaking gateway endpoint or credential path values.
- Worker heartbeat remains TODO.

## Phase 8 - Unit Test Expansion

Status: Partially complete.

Owning module:
All affected modules.

Deliverables:

- Config validation tests.
- Adapter unit tests.
- Hash/anchor verification helpers.
- Graph anchor overlay mapping tests.
- Permission and status-label tests.

Acceptance:

- Mock and gateway modes are both covered.
- Invalid config fails fast.
- No test depends on real external Fabric unless explicitly marked integration.

Current repository state:

- Config validation tests cover API and worker Fabric env readers.
- Worker tests prove gateway mode cannot return mock anchor success.
- API tests prove Fabric status output does not leak gateway endpoint values.

## Phase 9 - Integration Test Expansion

Owning module:
Integrations.

Deliverables:

- Worker/outbox integration tests for mock and Gateway-test modes.
- API integration tests for anchor status and reconciliation records.
- Graph integration tests for anchor nodes and role filtering.

Acceptance:

- Tests run against clean PostgreSQL/Redis/MinIO infrastructure.
- Real Fabric tests are isolated behind explicit environment gates.
- External provider failures do not break core workflow tests.

## Phase 10 - Browser E2E And Screenshot Documentation

Owning module:
Graph/Canvas and Evidence/Audit.

Deliverables:

- Playwright E2E for hash request, anchor status, integrations Gateway card, graph overlay, and role filtering.
- Updated screenshots in `docs/ui/assets/`.
- UI flow documentation for Fabric/graph path.

Acceptance:

- Browser test proves user-visible states match backend state.
- Screenshots come from production React routes.
- No screenshot presents mock state as real verified Fabric anchoring.

## Phase 11 - UAT Testing

Owning module:
Operations / QA.

Deliverables:

- UAT checklist updates for Fabric Gateway mode.
- Evidence capture package with seed JSON, screenshots, logs, and defects.
- Reviewer instructions for mock vs real Gateway mode.

Acceptance:

- UAT testers can distinguish API-backed data, fixtures, mock adapters, and real Gateway evidence.
- Critical workflow defects are logged with reproducible seed and environment data.

## Phase 12 - CI, Deployment, And Release Readiness

Status: Partially complete for CI, Compose config, and Azure VM Fabric secret-mount documentation.

Owning module:
Operations.

Deliverables:

- CI coverage for config and mock-mode tests.
- Optional gated real Fabric integration job.
- Azure VM deployment documentation for Gateway credentials/secrets.
- Release note with limitations and readiness status.

Acceptance:

- Pull requests run static checks, tests, and builds.
- Real Fabric secrets are not committed.
- Demo and production modes are documented separately.

Current repository state:

- CI and deployment workflows exist from prior phases.
- Production Compose mounts `deploy/fabric` read-only into API and worker
  containers for future Gateway certificate/key material.
- Azure VM deployment docs explain mock mode, Gateway mode, and VM-side Fabric
  certificate placement.
- Optional real Fabric integration CI and automated secret delivery remain TODOs.

## Phase 13 - Post-Demo Product Hardening

Owning modules:
All roadmap modules.

Deliverables:

- Backend summary DTOs for dashboard, procurement, finance, ledger, graph, audit, reports, and outbox.
- Production OIDC and invitation flow.
- Worker health endpoint.
- Report export endpoints.
- Loss exception workflow.
- Automated accessibility tests.

Acceptance:

- UAT blockers are resolved or accepted with owner/date.
- Production readiness review covers security, privacy, Shariah/legal, reliability, and deployment operations.

## Immediate Next Work

The next executable slices are:

1. Build the real Fabric chaincode/test-network foundation or confirm an
   existing network target.
2. Implement the worker Gateway adapter behind the existing outbox dispatch
   boundary.
3. Add database/API metadata for real anchor submission and verification.
4. Add the frontend Fabric Gateway status card using the new API status summary.
5. Add gated real Fabric integration tests after the network is available.
