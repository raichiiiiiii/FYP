# Fabric Blocker Decision Record

Status: Accepted implementation decision baseline  
Date: 2026-06-05  
Scope: Fabric implementation blockers `FG-001` through `FG-014` from `docs/roadmap/fabric-graph-implementation-todo.md`.

## Purpose

This record turns the current Fabric roadmap blockers into concrete implementation decisions. It also records the source-code scan used to confirm the current repository state before the next implementation pass.

This document is not a production consortium governance agreement. It is the repository-level baseline for implementing and testing the first real Fabric Gateway slice safely while preserving mock mode for local development, CI, and academic demo flows.

## Source documents used

Primary decision inputs:

- `docs/requirements/mudarabah_eprocurement_srs.tex`
- `docs/design/mepn_software_design_description.tex`
- `docs/adr/ADR-012-integration-boundary.md`
- `docs/adr/ADR-014-real-fabric-gateway-anchoring.md`
- `docs/technology-stack.md`
- `docs/roadmap/fabric-graph-ui-testing-plan.md`
- `docs/roadmap/fabric-graph-implementation-todo.md`
- `docs/roadmap/complete-implementation-plan.md`
- `docs/evidence/canonical-hash-verification.md`
- `docs/testing/uat-readiness.md`
- `deploy/fabric/README.md`

Supporting intake and UI/test files:

- `docs/roadmap/module-roadmap.md`
- `docs/roadmap/features/graph-read-only-project-canvas.md`
- `docs/roadmap/features/integration-outbox-control-panel.md`
- `docs/implementation-plan.md`

## Repository implementation scan

The scan covered API, worker, database schema, web integration status, and graph read-model code.

| Area | Files inspected | Current implementation finding |
| --- | --- | --- |
| API Fabric anchor request | `apps/api/src/modules/integrations/fabric/fabric-anchor.service.ts`, `apps/api/src/modules/integrations/fabric/fabric-anchor.controller.ts`, `apps/api/src/modules/integrations/fabric/fabric-anchor.adapter.ts` | API can create `FABRIC_ANCHOR_REQUESTED` outbox events with an idempotency key derived from organization, entity type, entity ID, and canonical hash. The adapter contract has mock/real result fields, but no real API-side Gateway adapter is wired. |
| API mock Fabric adapter | `apps/api/src/modules/integrations/fabric/mock-fabric-anchor.adapter.ts` | Mock adapter fabricates `mock-tx-*`, `fabricBlockNumber`, and `ANCHORED_MOCK`; this must remain mock-only. |
| API/worker Fabric env contract | `apps/api/src/config/fabric-env.ts`, `apps/worker/src/config/fabric-env.ts` | Both API and worker validate `FABRIC_MODE=mock|gateway`; `FABRIC_ENABLED=true` defaults to gateway mode; gateway mode requires Gateway URL, MSP ID, channel, chaincode, identity cert path, private key path, TLS cert path, peer endpoint, gateway host alias, and timeouts. |
| Worker adapter dispatch | `apps/worker/src/integrations/mock-adapters.ts`, `apps/worker/src/integrations/mock-adapters.spec.ts` | Worker still dispatches through `MockIntegrationAdapters`. It correctly throws when `FABRIC_MODE=gateway` receives `FABRIC_ANCHOR_REQUESTED`, preventing fake gateway success. |
| Worker outbox processing | `apps/worker/src/outbox/outbox-worker.service.ts` | Worker claims pending outbox events, stores reconciliation records, and creates `AuditAnchor` rows only through `storeMockFabricAnchor()` with `anchorType='FABRIC_MOCK'` and `status='ANCHORED_MOCK'`. Retry behavior exists, but real Gateway result handling does not. |
| Dependencies | `apps/api/package.json`, `apps/worker/package.json` | Neither API nor worker currently depends on `@hyperledger/fabric-gateway`. The real SDK should be added to the worker first, not the API, unless the API later performs direct Fabric verification queries. |
| Prisma schema | `apps/api/prisma/schema.prisma` | `HashRecord`, `AuditAnchor`, `OutboxEvent`, and `IntegrationReconciliationRecord` exist. `AuditAnchor` lacks first-class real Fabric fields such as transaction ID, block number, channel, chaincode, commit status, endorsement status, and verification timestamp. |
| Hash creation and verification | `apps/api/src/modules/evidence/hash-records/hash-records.service.ts`, `apps/api/src/modules/evidence/hash-records/hash-records.controller.ts`, `apps/api/src/modules/audit/audit-hash.service.ts` | Creating a `HashRecord` computes SHA-256 over canonical JSON, stores local hash evidence, and enqueues `FABRIC_ANCHOR_REQUESTED`. Verification recomputes local hash only and returns current anchor/outbox status; it does not query Fabric. |
| Integration status API/UI | `apps/api/src/modules/integrations/status/integration-status.service.ts`, `apps/web/src/features/integrations/status/integrationStatus.model.ts` | API exposes Fabric mode/configuration status and redacts configured values. `realGatewayAdapterImplemented` is hard-coded false. Web status cards honestly distinguish mock/configuration/degraded states. |
| Graph API/UI | `apps/api/src/modules/graph/graph.service.ts`, `apps/web/src/features/graph/model/networkGraph.types.ts`, `apps/web/src/features/graph/model/networkGraph.model.ts` | Backend graph read model emits organization, party, procurement, evidence-pack, and finance nodes. It does not include `HashRecord` or `AuditAnchor` nodes. Frontend has an `anchors` relationship mapping, but no `anchor` or `hash_record` node type yet. |

## Implementation decisions

### D-001: First real Fabric target is a local dev network

The next implementation pass will target a local Fabric test network first. Production/consortium topology remains a later operator decision.

Decision:

- Add dev network assets under `infra/fabric/` or `integrations/fabric/` according to the final workspace layout chosen during implementation.
- Keep production `docker-compose.prod.yml` free of peer/orderer/CA services unless a future ADR explicitly chooses self-hosted Fabric for SME production.
- Preserve external Gateway configuration as the production-oriented path.

Rationale:

- The repository needs a deterministic target for the Gateway adapter and gated integration tests.
- The SRS still leaves channel topology, endorsement policies, and private data collections open for production.
- A local network unblocks implementation without pretending production consortium governance is solved.

### D-002: Chaincode language and package

Decision:

- Use Go chaincode for the first `AuditAnchor` contract.
- Preferred path: `chaincode/audit-anchor-go/`.
- Chaincode name: `audit-anchor`.
- Default dev channel: `mepn-audit`.
- Default dev MSP: `Org1MSP` unless local network scaffolding standardizes a clearer name such as `PlatformOperatorMSP`.

Rationale:

- `docs/technology-stack.md` selects Go chaincode for audit anchors.
- ADR-014 and roadmap docs require hash-only Fabric payloads.

### D-003: Chaincode API

Decision:

Implement this minimum contract:

```text
CreateAnchor(anchorId, organizationId, entityType, entityId, canonicalHash, timestamp, idempotencyKey, metadataJson)
ReadAnchor(anchorId)
FindAnchorByHash(canonicalHash)
AnchorExists(anchorId)
```

Optional later functions:

```text
FindAnchorByIdempotencyKey(idempotencyKey)
FindAnchorsByEntity(entityType, entityId)
```

### D-004: On-chain payload boundary

Decision:

Fabric stores only:

- `anchorId`
- `organizationId` or a non-sensitive organization reference
- `entityType`
- `entityId` for MVP dev/test; production may replace this with `entityRefHash` if the operator classifies entity IDs as sensitive
- `canonicalHash`
- `hashAlgorithm`
- `timestamp`
- `idempotencyKey`
- optional `metadataHash`

Fabric must not store:

- document body
- canonical JSON body
- supplier bank details
- invoice contents
- quotation contents
- contract contents
- full finance records
- private keys, certificates, or secret paths

### D-005: Anchor ID and idempotency

Decision:

Use deterministic identifiers:

```text
idempotencyKey = fabric:{organizationId || global}:{entityType}:{entityId}:{canonicalHash}
anchorId = sha256(idempotencyKey)
```

Behavior:

- `CreateAnchor` with same `anchorId`, same `idempotencyKey`, and same `canonicalHash` returns/reconciles the existing anchor.
- `CreateAnchor` with same `anchorId` but different hash or idempotency key fails as an idempotency conflict.
- Worker retries transient Fabric errors using existing outbox retry behavior.
- Worker marks deterministic chaincode validation failures as failed/non-retryable when possible.

Rationale:

- The current API and hash-record service already derive idempotency keys from organization, entity type, entity ID, and canonical hash.
- Retried outbox events must not create duplicate on-chain writes.

### D-006: Real Gateway adapter belongs in the worker first

Decision:

- Add `@hyperledger/fabric-gateway` to `apps/worker/package.json` first.
- Do not add it to `apps/api/package.json` unless API-side chaincode query verification is implemented later.
- Replace direct `MockIntegrationAdapters` dispatch for Fabric with a small registry:

```text
FABRIC_MODE=mock    -> mock Fabric adapter
FABRIC_MODE=gateway -> real Fabric Gateway adapter
```

The worker Gateway adapter must:

- load cert/key/TLS material from configured paths;
- connect through gRPC/Gateway;
- select configured channel and chaincode;
- submit `CreateAnchor` with hash-only arguments;
- return real transaction/commit metadata only after successful commit;
- never fabricate transaction IDs;
- map duplicate/idempotent success to reconciled anchor status;
- preserve outbox retry behavior.

### D-007: Real metadata becomes first-class in `AuditAnchor`

Decision:

Add migration-backed nullable fields to `AuditAnchor`:

```prisma
fabricTransactionId     String?
fabricBlockNumber       Int?
fabricChannel           String?
fabricChaincode         String?
fabricCommitStatus      String?
fabricEndorsementStatus String?
fabricVerifiedAt        DateTime?
```

Continue storing raw adapter request/response context in `IntegrationReconciliationRecord.requestPayload` and `IntegrationReconciliationRecord.responsePayload`.

Rationale:

- API, audit, evidence, graph, UAT, and screenshots need stable typed fields for reviewer evidence.
- Reconciliation records remain the operational trace of adapter attempts and failures.

### D-008: Anchor status model

Decision:

The canonical backend status vocabulary for hash/evidence/audit surfaces is:

```text
NOT_REQUESTED
ANCHOR_REQUESTED
ANCHORED_MOCK
SUBMITTED
ANCHORED
VERIFIED
FAILED
FABRIC_UNAVAILABLE
```

Rules:

- `ANCHORED_MOCK` is never verified.
- `VERIFIED` requires local hash match, chaincode query match, and real transaction metadata.
- `SUBMITTED` or `ANCHORED` without verification query remains external submit/commit evidence, not full verification.
- Pending, failed, and unavailable states must stay visible to users.

### D-009: API verification endpoint

Decision:

After the worker Gateway adapter and chaincode query path exist, add:

```text
GET /api/v1/hash-records/:id/fabric-verification
```

Minimum response shape:

```json
{
  "hashRecordId": "...",
  "canonicalHash": "...",
  "localHashValid": true,
  "fabricAnchorFound": true,
  "fabricTransactionId": "...",
  "fabricBlockNumber": 123,
  "fabricChannel": "mepn-audit",
  "fabricChaincode": "audit-anchor",
  "status": "VERIFIED"
}
```

Keep `GET /api/v1/hash-records/:id/verify` as local hash verification unless or until it explicitly delegates to the Fabric verification endpoint.

### D-010: Graph anchor overlay depends on backend read model

Decision:

Do not implement graph overlay as UI-only mock state.

Backend graph must first add:

- `HashRecord` nodes;
- `AuditAnchor` nodes;
- `HashRecord -> source entity` edge labelled `verifies`;
- `AuditAnchor -> HashRecord` edge labelled `anchors`;
- pending/failed outbox state attached to the relevant hash record.

Frontend graph types must then add:

```ts
'anchor'
'hash_record'
```

and relationship:

```ts
'verifies'
```

Role rules:

- `ORG_ADMIN`, `AUDITOR`, `SHARIAH_REVIEWER`, `FINANCIER_USER`, and `FINANCE_ACCOUNTANT` may see anchor/hash context where their underlying source records are visible.
- `PROCUREMENT_OFFICER` may see procurement/evidence anchor status for procurement records.
- Finance-related anchors must be hidden when finance nodes are hidden.
- Hidden anchor endpoints must remove hidden anchor edges.

### D-011: Worker health source of truth

Decision:

Add a database-backed worker heartbeat rather than relying only on API process health.

Preferred table/model name:

```text
WorkerHeartbeat
```

Minimum fields:

```text
id
workerName
status
lastSeenAt
queueName
processedCount
failedCount
metadata
createdAt
updatedAt
```

Operations/integrations UI should classify:

- idle but recent heartbeat -> healthy/idle;
- old heartbeat -> unavailable;
- failed/retrying Fabric events -> degraded;
- no heartbeat feature yet -> not configured.

### D-012: Real integration tests are gated

Decision:

Default CI remains mock-only and deterministic.

Add optional real Fabric integration test path using:

```text
FABRIC_TEST_NETWORK_ENABLED=true
```

Required test flow:

1. Start PostgreSQL and local Fabric test network.
2. Deploy `audit-anchor` chaincode.
3. Insert or create a `FABRIC_ANCHOR_REQUESTED` outbox event.
4. Run worker once.
5. Assert outbox completion or correct failure classification.
6. Assert reconciliation record contains real transaction metadata.
7. Assert `AuditAnchor.anchorType='FABRIC'`.
8. Query chaincode and verify the canonical hash exists.

### D-013: Secret delivery

Decision:

- Runtime Fabric materials are mounted read-only at `/run/secrets/fabric` for deployed containers.
- Local/generated Fabric materials must remain outside committed files.
- `deploy/fabric/` remains the deployment secret-mount location and must continue to ignore actual certificates, keys, generated MSP folders, ledgers, and channel artifacts.
- CI secret delivery is a later gated workflow decision and must not be required for normal CI.

### D-014: UAT and screenshot honesty

Decision:

- UAT may proceed in mock mode only with explicit caveats.
- Fabric-specific UAT acceptance requires real Gateway mode only when chaincode, adapter, transaction metadata, and verification query are implemented.
- Screenshots must label mock anchors as mock/submitted, never verified.
- Verified screenshot state requires either a real Fabric-enabled test run or a clearly labelled seeded state that does not claim production proof.

## Blocker action matrix

| Blocker | Action required | Decision recorded | Files for input |
| --- | --- | --- | --- |
| `FG-001` Chaincode contract missing | Implement Go `audit-anchor` chaincode and unit tests. | D-002, D-003, D-004, D-005. | `docs/roadmap/fabric-graph-ui-testing-plan.md`; `docs/requirements/mudarabah_eprocurement_srs.tex`; `docs/technology-stack.md`; `docs/evidence/canonical-hash-verification.md` |
| `FG-002` Local network missing | Add local Fabric network scripts/docs and keep generated assets ignored. | D-001, D-002, D-013. | `docs/requirements/mudarabah_eprocurement_srs.tex`; `docs/design/mepn_software_design_description.tex`; `docs/roadmap/fabric-graph-ui-testing-plan.md`; `deploy/fabric/README.md` |
| `FG-003` Worker Gateway adapter missing | Add worker Fabric SDK adapter behind mode switch. | D-006. | `docs/adr/ADR-014-real-fabric-gateway-anchoring.md`; `docs/adr/ADR-012-integration-boundary.md`; `docs/technology-stack.md`; `docs/roadmap/fabric-graph-ui-testing-plan.md` |
| `FG-004` Idempotency not designed | Implement deterministic `anchorId`, chaincode duplicate handling, and worker duplicate reconciliation. | D-005. | `docs/adr/ADR-012-integration-boundary.md`; `docs/adr/ADR-014-real-fabric-gateway-anchoring.md`; `docs/requirements/mudarabah_eprocurement_srs.tex`; `docs/roadmap/fabric-graph-ui-testing-plan.md` |
| `FG-005` Metadata schema incomplete | Add nullable real Fabric fields to `AuditAnchor`; keep reconciliation payloads. | D-007, D-008. | `docs/roadmap/fabric-graph-ui-testing-plan.md`; `docs/roadmap/complete-implementation-plan.md`; `docs/requirements/mudarabah_eprocurement_srs.tex`; `docs/evidence/canonical-hash-verification.md` |
| `FG-006` Hash canonicalization docs | Keep closed; update if canonical hashing behavior changes. | D-004, D-008. | `docs/evidence/canonical-hash-verification.md`; `docs/requirements/mudarabah_eprocurement_srs.tex` |
| `FG-007` Graph overlay data missing | Extend backend graph with hash/anchor nodes and role-filtered edges before UI overlay. | D-010. | `docs/roadmap/fabric-graph-ui-testing-plan.md`; `docs/roadmap/features/graph-read-only-project-canvas.md`; `docs/roadmap/module-roadmap.md`; `docs/implementation-plan.md` |
| `FG-008` Worker health missing | Add DB-backed worker heartbeat and surface status in operations UI. | D-011. | `docs/roadmap/fabric-graph-implementation-todo.md`; `docs/roadmap/fabric-graph-ui-testing-plan.md`; `docs/design/mepn_software_design_description.tex`; `docs/implementation-plan.md` |
| `FG-009` Gateway UI card | Keep closed; extend only with real heartbeat/probe evidence. | D-008, D-014. | `docs/roadmap/fabric-graph-implementation-todo.md`; `docs/roadmap/fabric-graph-ui-testing-plan.md`; `docs/testing/uat-readiness.md` |
| `FG-010` Real integration tests missing | Add optional Fabric-enabled worker/API integration tests. | D-012. | `docs/roadmap/fabric-graph-ui-testing-plan.md`; `docs/roadmap/complete-implementation-plan.md`; `docs/testing/uat-readiness.md`; `deploy/fabric/README.md` |
| `FG-011` E2E evidence states incomplete | Add Playwright flows after backend status model and seed/real states exist. | D-008, D-010, D-014. | `docs/roadmap/fabric-graph-ui-testing-plan.md`; `docs/testing/uat-readiness.md`; `docs/evidence/canonical-hash-verification.md`; `docs/implementation-plan.md` |
| `FG-012` UAT instructions | Keep closed; update when real Gateway proof exists. | D-014. | `docs/testing/uat-readiness.md`; `docs/roadmap/fabric-graph-ui-testing-plan.md`; `docs/evidence/canonical-hash-verification.md` |
| `FG-013` Secret handling partial | Preserve `/run/secrets/fabric`; add CI secret strategy only for gated Fabric job. | D-013. | `deploy/fabric/README.md`; `docs/adr/ADR-014-real-fabric-gateway-anchoring.md`; `docs/requirements/mudarabah_eprocurement_srs.tex`; `docs/roadmap/fabric-graph-ui-testing-plan.md` |
| `FG-014` Product hardening outside Fabric slice | Keep separate from real Fabric slice; do not block chaincode/adapter work. | D-014 for UAT honesty; production hardening remains backlog. | `docs/roadmap/fabric-graph-implementation-todo.md`; `docs/implementation-plan.md`; `docs/testing/uat-readiness.md`; `docs/requirements/mudarabah_eprocurement_srs.tex` |

## Next implementation order

1. Add Go chaincode and chaincode unit tests.
2. Add local Fabric dev network scripts/docs.
3. Add worker Fabric Gateway SDK dependency and adapter registry.
4. Implement real worker Gateway adapter.
5. Add `AuditAnchor` metadata migration.
6. Update hash/evidence/audit API status models.
7. Add Fabric verification query endpoint.
8. Add graph hash/anchor backend read model.
9. Add graph UI anchor/hash types and filters.
10. Add worker heartbeat.
11. Add unit, integration, E2E, screenshot, and UAT updates.
12. Add optional gated Fabric CI workflow.

## Non-goals for this decision record

- It does not choose production consortium membership.
- It does not choose production endorsement policy beyond the local dev default.
- It does not approve private data collection usage.
- It does not claim real Fabric Gateway readiness.
- It does not replace ADR-014; it operationalizes it for the next implementation pass.
