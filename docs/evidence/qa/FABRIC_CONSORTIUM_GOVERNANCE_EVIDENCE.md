# Fabric Consortium Governance Evidence

## Scope

This evidence records the first implemented Fabric consortium governance slice:
operator-assisted channel governance metadata, proposals, invitations,
approvals, readiness checks, and sanitized operator execution evidence.

This feature does **not** create Fabric channels, join peers, enroll MSP
identities, sign channel configuration updates, or store Fabric administrator
private keys inside MEPN.

## Implemented Boundary

| Capability | Status | Evidence |
|---|---|---|
| Fabric network/channel metadata registry | Implemented | `FabricNetwork`, `FabricChannel`, and `FabricChannelMembership` Prisma models. |
| Channel governance proposal creation | Implemented | `POST /api/v1/fabric/channels` creates metadata plus a `create_channel` proposal only. |
| Organization invitation and acceptance | Implemented | Invitation create/list/accept/revoke endpoints and membership status updates. |
| Governance approvals | Implemented | Proposal approve/reject/cancel endpoints with role enforcement. |
| Operator execution record | Implemented | Operator execution/failure endpoints store sanitized evidence and update metadata state. |
| Readiness check | Implemented | `GET /api/v1/fabric/channels/:id/readiness` combines proposal, invitation, membership, and Gateway runtime configuration status. |
| Admin/reviewer UI | Implemented | `/fabric-governance` route shows channel registry, proposal form, invitations, approvals, readiness, and operator evidence controls. |
| Direct Fabric topology mutation | Not implemented by design | Deferred until a separate production automation/secret-custody ADR is approved. |

## API Surface

```text
GET  /api/v1/fabric/networks
POST /api/v1/fabric/networks
GET  /api/v1/fabric/channels
POST /api/v1/fabric/channels
GET  /api/v1/fabric/channels/:id
GET  /api/v1/fabric/channels/:id/readiness
POST /api/v1/fabric/channels/:id/invitations
GET  /api/v1/fabric/channels/:id/invitations
POST /api/v1/fabric/channel-invitations/:id/accept
POST /api/v1/fabric/channel-invitations/:id/revoke
GET  /api/v1/fabric/channels/:id/memberships
POST /api/v1/fabric/channels/:id/proposals
GET  /api/v1/fabric/channel-proposals/:id
POST /api/v1/fabric/channel-proposals/:id/approve
POST /api/v1/fabric/channel-proposals/:id/reject
POST /api/v1/fabric/channel-proposals/:id/cancel
POST /api/v1/fabric/channel-proposals/:id/operator-execution
POST /api/v1/fabric/channel-proposals/:id/operator-failure
GET  /api/v1/fabric/channel-proposals/:id/evidence
```

## Validation Commands

| Command | Result |
|---|---|
| `corepack pnpm --dir apps/api run test:unit -- fabric-governance` | Passed. |
| `corepack pnpm --dir apps/api run test:integration -- fabric-governance` | Passed. |
| `corepack pnpm --dir apps/api run lint` | Passed. |
| `corepack pnpm --dir apps/api run build` | Passed. |
| `corepack pnpm --dir apps/web run test -- fabric-governance` | Passed. |
| `corepack pnpm --dir apps/web run lint` | Passed. |
| `corepack pnpm --dir apps/web run build` | Passed. |

## Security Notes

- Operator evidence sanitizer rejects PEM blocks, private-key strings, token,
  password, secret, `.env`, `key.pem`, `cert.pem`, and MSP folder path markers.
- Operator execution records are attestations that work was completed outside
  MEPN. They are not proof that MEPN itself changed Fabric topology.
- Fabric hash-record verification rules remain unchanged: `verified=true`
  still requires API-side chaincode `ReadAnchor` verification.

## Remaining Hardening

- Automated channel creation, peer join, MSP enrollment, admin signing, and
  channel-config submission remain deferred.
- Production automation requires a managed secret-custody decision, operator
  agent design, and a separate ADR.
