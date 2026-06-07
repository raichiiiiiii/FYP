# ADR-016: UAT Fabric Blocker Resolution Path

## Status

Proposed for product-owner, Fabric operator, and security review.

## Date

2026-06-07

## Context

The SRS use-case UAT blocker file tracks two high-severity Fabric blockers:

- UAT-B-003: Fabric topology mutation is intentionally not implemented.
- UAT-B-004: Seeded hash and anchor metadata must not be treated as real Fabric
  proof.

MEPN already supports operator-assisted Fabric governance metadata and readiness
checks. It also supports API-side Fabric proof verification when the backend can
query chaincode `ReadAnchor` and compare the on-chain hash with the local
canonical hash.

These two blockers require different resolution paths. Topology mutation is an
administrative Fabric operation that requires channel/orderer authority and
managed key custody. Real proof verification is an evidentiary runtime operation
that requires a live Gateway, anchored hash record, and successful chaincode
read.

## Decision

MEPN will keep UAT-B-003 and UAT-B-004 separate.

UAT-B-003 may only be resolved by one of these approved future choices:

1. Keep topology mutation operator-assisted and record sanitized operator
   evidence only. This keeps the blocker as an intentional boundary.
2. Approve ADR-015 and implement a dedicated Fabric operator-agent boundary with
   managed key custody, recovery policy, disposable-network integration tests,
   and explicit feature gating.
3. Integrate with an external Fabric operations platform that owns admin key
   custody and returns auditable execution results to MEPN.

UAT-B-004 may only be resolved by live proof evidence:

1. Configure a real Fabric Gateway using mounted runtime material.
2. Create or locate a hash record anchored by the real Gateway worker.
3. Query chaincode `ReadAnchor` from the API.
4. Compare local canonical hash, stored anchor hash, and on-chain anchor hash.
5. Return `verified=true` only when those hashes match.
6. Capture reviewer evidence through the existing gated UAT proof flow.

Seeded data, mock adapters, local metadata, and stored transaction references
must never resolve UAT-B-004 by themselves.

## Required Decisions Before Direct Topology Automation

Before MEPN can implement direct topology automation, the project must approve:

- admin key custody model;
- operator-agent execution contract;
- orderer/channel administration authority;
- signing and endorsement policy;
- retry and recovery plan for partial topology changes;
- secret mount and rotation process;
- sanitized logging/evidence rules;
- disposable real Fabric integration test environment;
- rollback and incident response procedure.

Gateway anchoring identity material must not be reused as topology-admin
material.

## Required Evidence Before Real Fabric Proof Is Marked Passed

Real proof evidence must include:

- live environment identifier;
- hash record id;
- local canonical hash;
- stored anchor hash;
- on-chain anchor hash returned by `ReadAnchor`;
- transaction id;
- channel and chaincode names;
- MSP id;
- verification API response showing `verified=true`;
- screenshots from the reviewer proof panel;
- command/test run output with secrets redacted.

## Consequences

UAT-B-003 remains an intentional boundary unless a future approved topology
automation ADR and operator-agent implementation exists.

UAT-B-004 remains environment-gated until a real live Fabric Gateway hash record
is available. Local seeded records may support UI and workflow testing, but they
must remain labelled as local, pending, unavailable, mock, or not fully
verified.

This ADR prevents the project from resolving Fabric blockers by weakening proof
truth rules or by moving admin Fabric key custody into the normal application
runtime without review.

## Links

- `docs/adr/ADR-014-real-fabric-gateway-anchoring.md`
- `docs/adr/ADR-015-fabric-topology-automation-boundary.md`
- `docs/evidence/uat/USE_CASE_BLOCKERS.md`
