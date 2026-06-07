# ADR-015: Fabric Topology Automation Boundary

## Status

Proposed for product-owner and security review.

## Date

2026-06-07

## Context

MEPN already supports real Fabric Gateway anchoring for hash proofs and
API-side `ReadAnchor` verification. It also supports Fabric consortium
governance as an operator-assisted workflow: network/channel metadata,
invitations, approvals, readiness checks, and sanitized operator evidence.

Direct Fabric topology automation is a different risk class from Gateway
anchoring. Creating channels, joining organizations, enrolling MSP material, and
submitting channel config updates require channel-admin and orderer-admin
authority. Those operations can change consortium topology and may leave
partially applied state if interrupted.

The current accepted governance requirement says MEPN must not initially store
Fabric admin private keys, enroll MSP identities directly, sign channel config
updates, manage orderers, or submit channel config updates automatically.

## Decision

Direct Fabric topology automation remains disabled by default.

The application may expose a readiness/preflight API that reports whether the
runtime has the required decisions and non-secret configuration for a future
operator-agent execution path. The readiness API must not print, return, or log
secret contents.

Direct execution may only be implemented behind an explicit feature flag after
all of these are approved and configured:

- Direct Fabric topology automation ADR approval.
- Channel admin secret custody approval.
- Retry/recovery policy approval for partial topology changes.
- Dedicated operator-agent endpoint.
- Channel admin MSP ID.
- Channel admin signing certificate and key paths.
- Orderer admin endpoint.
- Orderer admin TLS certificate and key paths.
- `configtx` profile and source path.
- Gated integration tests against a disposable real Fabric network.

Gateway anchoring identity material must not be reused as topology-admin
material.

## Consequences

The current operator-assisted governance workflow remains the production-safe
default. Organization admins can request and approve governance changes, and
platform operators can record sanitized execution evidence, but the API does not
mutate Fabric topology.

The new readiness/preflight API can unblock implementation planning and
deployment diagnosis without creating a fake direct execution path.

Future direct execution must be implemented through a dedicated operator agent
or equivalent execution boundary. The API should request execution and audit the
result; it should not become a general-purpose Fabric admin shell.

## Current Preflight Endpoint

```http
GET /api/v1/fabric/automation/readiness
```

Required query parameters follow existing governance routes:

```text
organizationId
actorUserId
```

The endpoint returns:

- whether automation is enabled;
- readiness status: `disabled`, `blocked`, or `ready`;
- missing requirement identifiers;
- limitations;
- next actions.

It is accessible only to Fabric governance readable roles.

## Explicit Non-Goals

- No private key, PEM, MSP folder, token, password, or admin certificate content
  may be returned from the readiness endpoint.
- No direct channel creation is performed by the readiness endpoint.
- No direct organization join is performed by the readiness endpoint.
- No automatic Fabric CA enrollment is performed by the readiness endpoint.
- No production-ready topology automation is claimed until a real Fabric
  integration test proves it.

## Resume Criteria For Direct Automation

Direct automation implementation may resume when:

1. This ADR is accepted.
2. Secret custody and recovery policy are approved.
3. A dedicated operator-agent contract is chosen.
4. Admin and orderer material are mounted under a documented path with
   restricted permissions.
5. Tests can create and join a channel in a disposable Fabric test consortium
   without exposing secrets.
