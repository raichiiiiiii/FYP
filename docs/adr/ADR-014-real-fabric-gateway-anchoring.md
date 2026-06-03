# ADR-014: Real Fabric Gateway Anchoring

## Status

Accepted

## Context

MEPN currently implements Fabric anchoring through a mock adapter behind the
integration outbox boundary. This is correct for local development and
prototype demonstration, but the SRS also requires eventual anchoring through an
approved Hyperledger Fabric Gateway.

The repository already has:

- `FABRIC_ANCHOR_REQUESTED` outbox events
- mock Fabric adapter behavior
- `AuditAnchor` records
- reconciliation records
- hash verification UI states
- graph/canvas and integration surfaces that label mock states honestly

The next implementation step must define the real Gateway configuration surface
without weakening the existing mock/default behavior.

## Decision

MEPN will support two Fabric modes:

| Mode | Purpose |
| --- | --- |
| `mock` | Default local, CI, and demo mode. No Fabric credentials required. Anchor results are explicitly labelled mock. |
| `gateway` | Real Fabric Gateway mode. Requires explicit identity, channel, chaincode, peer, TLS, and timeout configuration. |

`FABRIC_ENABLED=false` and `FABRIC_MODE=mock` remain the safe defaults.

If `FABRIC_ENABLED=true` is set without `FABRIC_MODE`, the runtime treats this
as intent to use `gateway` mode and validates all required Gateway settings. A
developer may explicitly set `FABRIC_ENABLED=true` and `FABRIC_MODE=mock` only
for a mock-enabled integration environment.

Real Gateway submissions must remain:

- outbox-driven
- idempotent
- retryable
- reconcilable
- non-blocking for local procurement, evidence, audit, and finance workflows

Fabric payloads must contain only:

- canonical hashes
- organization/entity identifiers required for verification
- timestamps
- transaction/reference metadata
- minimum status metadata

Confidential procurement payloads, contracts, bank details, invoices,
quotations, uploaded documents, and full finance records remain off-chain.

## Required Environment Contract

Real Gateway mode requires:

```text
FABRIC_ENABLED=true
FABRIC_MODE=gateway
FABRIC_GATEWAY_URL
FABRIC_MSP_ID
FABRIC_CHANNEL
FABRIC_CHAINCODE
FABRIC_IDENTITY_CERT_PATH
FABRIC_PRIVATE_KEY_PATH
FABRIC_TLS_CERT_PATH
FABRIC_PEER_ENDPOINT
FABRIC_GATEWAY_HOST_ALIAS
FABRIC_SUBMIT_TIMEOUT_MS
FABRIC_COMMIT_TIMEOUT_MS
```

Mock mode requires no Fabric credentials.

## Consequences

- Local development and CI remain stable in mock mode.
- Real Fabric work can start without changing core business workflows.
- Gateway mode fails fast when required configuration is missing.
- UI and audit surfaces must continue to distinguish mock, pending, submitted,
  verified, failed, and unavailable states.
- Real Fabric SDK dependencies are deferred until the Gateway adapter slice.
