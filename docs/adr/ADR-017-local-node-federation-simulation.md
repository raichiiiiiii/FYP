# ADR-017: Local Node Federation Simulation

## Status

Accepted for local/UAT implementation.

## Date

2026-06-07

## Context

MEPN is positioned as a self-hosted organization node. The local review
environment needs to demonstrate multiple independently hosted nodes that can
discover peers, exchange channel metadata, and show cross-organization network
relationships.

ADR-015 keeps real Fabric topology mutation outside the normal application
runtime. ADR-016 keeps real proof verification gated behind live Fabric Gateway
`ReadAnchor` hash comparison. Those boundaries remain valid.

The missing local capability is not real Fabric channel administration. The
missing capability is a local/UAT simulation layer that proves the product can
represent separate self-hosted nodes and their network relationships without
pretending to create real Fabric topology.

## Decision

MEPN may implement a local/UAT node federation simulation layer.

In this mode, MEPN nodes may use backend-to-backend API calls to create and
sync:

- node deployment metadata;
- peer metadata;
- simulated channel metadata;
- simulated channel invitations and memberships;
- sanitized operator/readiness evidence;
- audit events;
- graph/canvas relationships.

The simulation layer must use explicit status values such as:

- `simulated_proposed`;
- `simulated_invited`;
- `simulated_joined`;
- `simulated_active`;
- `operator_pending`;
- `real_fabric_unavailable`.

## Boundaries

The local simulation layer must not:

- create real Fabric channels;
- join real peers to a Fabric channel;
- enroll MSP material;
- mutate orderer/channel configuration;
- store Fabric admin private keys;
- reuse Gateway anchoring identity material as topology-admin material;
- mark local seeded or simulated metadata as real on-chain proof.

Real Fabric topology automation remains future operator-agent work and remains
controlled by ADR-015.

Real Fabric proof remains controlled by ADR-016 and requires backend
`ReadAnchor` verification with matching hashes before `verified=true` can be
shown.

## Consequences

The local multi-node demo can run several self-hosted MEPN nodes on one
machine, seed one organization per node database, and establish reviewer-visible
network/channel relationships without requiring real Fabric administration.

The implementation must label simulated channel state honestly. Reviewer
evidence may claim local federation metadata and canvas behavior, but must not
claim real Fabric topology mutation or real Fabric proof from the simulation.

## Implemented API Surface

The accepted local/UAT simulation boundary is implemented through:

```http
GET  /api/v1/node-federation/status
GET  /api/v1/node-federation/peers
POST /api/v1/node-federation/peers
POST /api/v1/node-federation/peers/:peerId/ping
GET  /api/v1/node-federation/channels
POST /api/v1/node-federation/channels
POST /api/v1/node-federation/channels/:channelId/invite
POST /api/v1/node-federation/invitations/:invitationId/accept
POST /api/v1/node-federation/events
GET  /api/v1/node-federation/canvas
```

These endpoints persist `NodeDeployment`, `NodePeer`, `NodeChannel`,
`NodeChannelMembership`, `OutboundNodeEvent`, and `InboundNodeEvent` records.
Inbound node events use a local shared-secret boundary for the UAT demo and
reject secret-like payload material. The implementation remains local/simulated:
it does not create real Fabric channels, join real peers, onboard MSP material,
or mark Fabric proof as verified.

## Related Work

- `docs/adr/ADR-015-fabric-topology-automation-boundary.md`
- `docs/adr/ADR-016-uat-fabric-blocker-resolution-path.md`
- `docs/roadmap/multi-node-federation-implementation-plan.md`
