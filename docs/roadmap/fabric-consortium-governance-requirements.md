# Fabric Consortium Governance Requirements And Base Decision

**Status:** Proposed for product-owner review  
**Date:** 2026-06-06  
**Scope:** Future Fabric channel governance feature for MEPN  
**Decision owner:** Product owner with technical/security sign-off  

## 1. Executive Decision

Because the product owner wants an in-app Fabric channel governance feature, MEPN should implement it as an **operator-assisted consortium governance workflow**, not as fully automated Fabric topology administration in the first release.

The recommended base decision is:

> MEPN will manage Fabric channel proposals, invitations, approvals, readiness checks, audit evidence, and operator execution records. The app will not initially hold Fabric admin private keys or directly mutate Fabric channel topology. A platform/Fabric operator will execute channel config changes outside the app, then upload sanitized execution evidence back into MEPN.

This is the easiest and safest version to manage and implement because it gives users a real product workflow while avoiding the hardest production risks: MSP private-key custody, channel config signing inside the app, peer/orderer lifecycle control, and partially automated consortium changes.

## 2. Why This Model Is Best For The Current Project

A fully automated `POST /api/v1/fabric/channels` that creates a real Fabric channel would require the application to custody Fabric admin identities, generate or sign channel config updates, coordinate signatures across organizations, and recover from partially applied topology changes. That is high-risk and too large for the current review/product-hardening stage.

The operator-assisted model is better because:

1. It provides a visible Organization Admin feature.
2. It keeps private Fabric admin material outside the application.
3. It gives auditors a full approval/evidence trail.
4. It is implementable with the current audit/outbox/evidence architecture.
5. It can later evolve into automated execution if a managed secret store and operator agent are approved.

## 3. Base Architecture Boundary

### In scope for the app

The MEPN application may manage:

- Fabric network metadata.
- Fabric channel metadata.
- Channel creation proposals.
- Channel invitation proposals.
- Organization acceptance records.
- Governance approvals.
- Readiness checks.
- Operator execution packages.
- Sanitized execution evidence.
- Audit events and hash-record evidence for governance actions.

### Out of scope for the first implementation

The MEPN application must not initially:

- Store Fabric admin private keys.
- Enroll MSP identities directly.
- Generate production MSP material.
- Sign channel config updates using admin certificates.
- Create/join peers automatically.
- Manage orderers.
- Submit channel config updates automatically.
- Change endorsement policies automatically.
- Act as a full Fabric CA/admin console.

## 4. Prerequisite Decisions

| No. | Decision Area | Recommended Easier Decision | Rationale | First Implementation Requirement |
|---:|---|---|---|---|
| 1 | Fabric consortium governance model | **Hub-and-spoke with MEPN Platform Operator as channel sponsor/coordinator.** App organizations request and approve membership; operator executes topology changes. | Easier than decentralized N-of-M governance for the first release. | Add `PLATFORM_OPERATOR` and `FABRIC_GOVERNANCE_ADMIN` authority boundaries. |
| 2 | MSP/certificate issuance process | **Out-of-band operator-issued MSP material.** App stores only MSP ID, certificate fingerprints, public certificate metadata, and expiry. | Avoids making MEPN a Fabric CA. | Add metadata fields for MSP ID, certificate fingerprint, issuer, expiry, and status. |
| 3 | Admin certificate custody model | **No Fabric admin private keys in MEPN.** Operator keeps admin material outside the app. | Reduces catastrophic secret leakage risk. | Governance execution requires operator attestation/evidence upload. |
| 4 | Secret storage and rotation model | **Current demo:** GitHub secrets and `/run/secrets/fabric` for Gateway app identity only. **Future:** Azure Key Vault or managed secret store. | Aligns with current deployment while leaving production path open. | Document that channel-admin secrets are excluded from app runtime. |
| 5 | Channel config signing process | **Operator-assisted signing.** App creates proposal dossier and approval record; operator signs/submits outside app. | Avoids implementing Fabric config signing workflow prematurely. | Store proposal package digest, approvals, execution result, and evidence hash. |
| 6 | Approval thresholds | **MVP threshold:** sponsor Org Admin + invited Org Admin + Platform Operator. **Policy updates:** Platform Operator + majority of active channel members, later. | Simple enough for first implementation, extensible later. | Add proposal approval status and required approver roles. |
| 7 | Legal/security authority | **Explicit app-level authority only.** Organization Admin cannot mutate Fabric topology unless assigned `FABRIC_GOVERNANCE_ADMIN`; Platform Operator executes. | Separates business admin from Fabric operator authority. | Add role/permission checks and acceptance attestation text. |
| 8 | Audit/evidence requirements | **Audit every governance action.** Anchor governance evidence where useful. | Required for procurement-finance trust and reviewability. | Emit audit/outbox/hash records for proposal, invite, accept, approve, execute, fail, retry. |
| 9 | Recovery process | **Revisioned proposals.** Failed proposals are not overwritten; retry creates a new proposal revision. | Prevents ambiguous partial state. | Add statuses and retry/revision fields. |
| 10 | Production deployment target | **First target:** Azure Student VM / VM-local Fabric demo. **Production target:** separate managed deployment decision. | Keeps implementation realistic. | Docs must state first implementation is governance workflow, not production consortium automation. |

## 5. Proposed Domain Model

### `FabricNetwork`

Represents a logical Fabric network known to MEPN.

Suggested fields:

- `id`
- `name`
- `environment`: `local`, `vm-local`, `staging`, `production`
- `governanceModel`: `operator_assisted`
- `operatorOrganizationId`
- `status`: `draft`, `active`, `degraded`, `retired`
- `createdAt`, `updatedAt`

### `FabricChannel`

Represents a Fabric channel metadata record, not necessarily a channel created directly by the app.

Suggested fields:

- `id`
- `fabricNetworkId`
- `channelName`
- `chaincodeName`
- `status`: `proposed`, `operator_pending`, `active`, `failed`, `retired`
- `createdByOrganizationId`
- `operatorVerifiedAt`
- `readinessStatus`
- `createdAt`, `updatedAt`

### `FabricChannelMembership`

Represents an organization’s participation in a channel.

Suggested fields:

- `id`
- `fabricChannelId`
- `organizationId`
- `mspId`
- `membershipStatus`: `invited`, `accepted`, `operator_pending`, `joined`, `suspended`, `removed`, `failed`
- `certificateFingerprint`
- `certificateExpiresAt`
- `joinedAt`
- `createdAt`, `updatedAt`

### `FabricChannelInvitation`

Represents an invitation for another organization to join a Fabric channel.

Suggested fields:

- `id`
- `fabricChannelId`
- `invitedOrganizationId`
- `invitedEmail`
- `invitedMspId`
- `status`: `pending`, `accepted`, `rejected`, `expired`, `revoked`
- `expiresAt`
- `acceptedAt`
- `createdByUserId`
- `acceptedByUserId`

### `FabricChannelProposal`

Represents a governance proposal for channel creation, join, membership update, or policy update.

Suggested fields:

- `id`
- `fabricChannelId`
- `proposalType`: `create_channel`, `invite_org`, `join_channel`, `update_policy`, `remove_org`
- `revision`
- `status`: `draft`, `pending_approval`, `approved`, `operator_pending`, `executed`, `failed`, `cancelled`
- `proposalPayload`
- `proposalDigest`
- `requiredApprovals`
- `createdByUserId`
- `operatorUserId`
- `executedAt`
- `failureReason`

### `FabricGovernanceApproval`

Records approval or rejection by an authorized actor.

Suggested fields:

- `id`
- `proposalId`
- `organizationId`
- `actorUserId`
- `roleCode`
- `decision`: `approved`, `rejected`
- `rationale`
- `createdAt`

### `FabricGovernanceEvidence`

Stores sanitized evidence about proposal execution.

Suggested fields:

- `id`
- `proposalId`
- `evidenceType`: `operator_command_summary`, `config_update_digest`, `channel_readiness_check`, `gateway_probe`, `error_log_summary`
- `storageUri`
- `contentHash`
- `metadata`
- `createdByUserId`
- `createdAt`

## 6. Proposed API Surface

The API should make the governance boundary explicit. Names below are proposed.

### Network and channel registry

```http
GET  /api/v1/fabric/networks
POST /api/v1/fabric/networks
GET  /api/v1/fabric/channels
POST /api/v1/fabric/channels
GET  /api/v1/fabric/channels/:id
GET  /api/v1/fabric/channels/:id/readiness
```

Important: `POST /api/v1/fabric/channels` creates a **channel governance proposal and metadata record**, not a real Fabric channel unless an approved operator execution step completes.

### Invitations and memberships

```http
POST /api/v1/fabric/channels/:id/invitations
GET  /api/v1/fabric/channels/:id/invitations
POST /api/v1/fabric/channel-invitations/:id/accept
POST /api/v1/fabric/channel-invitations/:id/revoke
GET  /api/v1/fabric/channels/:id/memberships
```

### Proposals and approvals

```http
POST /api/v1/fabric/channels/:id/proposals
GET  /api/v1/fabric/channel-proposals/:id
POST /api/v1/fabric/channel-proposals/:id/approve
POST /api/v1/fabric/channel-proposals/:id/reject
POST /api/v1/fabric/channel-proposals/:id/cancel
```

### Operator execution record

```http
POST /api/v1/fabric/channel-proposals/:id/operator-execution
POST /api/v1/fabric/channel-proposals/:id/operator-failure
GET  /api/v1/fabric/channel-proposals/:id/evidence
```

The operator execution endpoint records what was executed and stores sanitized evidence. It must not upload private keys, admin certificates, or raw secret files.

## 7. Roles And Permissions

| Role | Capability |
|---|---|
| `ORG_ADMIN` | Can request governance access but should not automatically mutate Fabric topology. |
| `FABRIC_GOVERNANCE_ADMIN` | Can create Fabric channel proposals and invite organizations on behalf of their app organization. |
| `PLATFORM_OPERATOR` | Can mark proposals as operator-executed or failed and upload sanitized execution evidence. |
| `AUDITOR` | Read-only access to proposals, approvals, readiness, and execution evidence. |
| `PROCUREMENT_OFFICER`, `FINANCIER_USER`, `SHARIAH_REVIEWER` | No Fabric channel mutation rights by default. |

## 8. Approval Thresholds

### MVP thresholds

| Action | Required approvals |
|---|---|
| Create new Fabric channel metadata/proposal | Requesting organization `FABRIC_GOVERNANCE_ADMIN` + `PLATFORM_OPERATOR` |
| Invite organization to channel | Existing channel sponsor `FABRIC_GOVERNANCE_ADMIN` + invited organization `ORG_ADMIN` or `FABRIC_GOVERNANCE_ADMIN` + `PLATFORM_OPERATOR` |
| Accept invitation | Invited organization `ORG_ADMIN` or `FABRIC_GOVERNANCE_ADMIN` |
| Mark operator execution complete | `PLATFORM_OPERATOR` |
| Mark proposal failed | `PLATFORM_OPERATOR` with failure reason |

### Future production thresholds

For real production, policy updates and removal of members should require a majority or configured threshold of channel members. This should remain future work until consortium governance policy is approved.

## 9. Status Lifecycle

### Channel proposal lifecycle

```text
draft
  -> pending_approval
  -> approved
  -> operator_pending
  -> executed
```

Failure and cancellation paths:

```text
pending_approval -> rejected
pending_approval -> cancelled
approved -> cancelled
operator_pending -> failed
failed -> superseded_by_new_revision
```

### Channel membership lifecycle

```text
invited
  -> accepted
  -> operator_pending
  -> joined
```

Failure and removal paths:

```text
invited -> expired
invited -> revoked
operator_pending -> failed
joined -> suspended
joined -> removed
```

## 10. Audit And Evidence Requirements

Every governance mutation must emit an audit event.

Required audit event types:

- `FABRIC_NETWORK_CREATED`
- `FABRIC_CHANNEL_PROPOSED`
- `FABRIC_CHANNEL_INVITATION_CREATED`
- `FABRIC_CHANNEL_INVITATION_ACCEPTED`
- `FABRIC_CHANNEL_PROPOSAL_APPROVED`
- `FABRIC_CHANNEL_PROPOSAL_REJECTED`
- `FABRIC_CHANNEL_OPERATOR_EXECUTION_RECORDED`
- `FABRIC_CHANNEL_OPERATOR_EXECUTION_FAILED`
- `FABRIC_CHANNEL_READINESS_CHECKED`
- `FABRIC_CHANNEL_MEMBERSHIP_JOINED`
- `FABRIC_CHANNEL_MEMBERSHIP_FAILED`

Evidence records should store only sanitized metadata, command summaries, content hashes, and readiness results. They must not store private keys, PEM blocks, admin MSP folders, connection profiles containing secrets, or raw terminal logs with sensitive content.

## 11. Readiness Checks

`GET /api/v1/fabric/channels/:id/readiness` should return:

- channel metadata status;
- required approvals status;
- invitation status;
- operator execution status;
- Gateway environment configured/not configured;
- chaincode configured/not configured;
- latest successful gateway probe if available;
- whether current application Fabric verification can use the channel.

Example readiness response:

```json
{
  "fabricChannelId": "...",
  "channelName": "auditchannel",
  "status": "active",
  "ready": true,
  "governance": {
    "requiredApprovals": 3,
    "receivedApprovals": 3,
    "operatorExecution": "executed"
  },
  "runtime": {
    "gatewayConfigured": true,
    "chaincodeConfigured": true,
    "lastProbeStatus": "available"
  },
  "limitations": [
    "Channel topology was operator-executed outside the app."
  ]
}
```

## 12. Implementation Phases

### Phase 0 — Documentation and ADR

Deliverables:

- This requirements document.
- LaTeX version for report inclusion.
- Roadmap/product-hardening backlog entry.

Acceptance:

- Product owner can approve/reject the governance boundary.
- No runtime code changed.

### Phase 1 — Read-only Fabric network/channel registry

Deliverables:

- `FabricNetwork`, `FabricChannel`, `FabricChannelMembership` models.
- Read-only/list/detail APIs.
- Readiness endpoint with current configured Gateway status.

Acceptance:

- Admins can see configured Fabric channel metadata.
- No Fabric topology mutation occurs.

### Phase 2 — Proposal, invitation, and approval workflow

Deliverables:

- Channel proposal APIs.
- Invitation create/accept/revoke APIs.
- Governance approval APIs.
- Audit events.

Acceptance:

- Organization Admin can initiate governance workflow.
- Invited organization can accept.
- Platform Operator approval is required before execution.

### Phase 3 — Operator execution package and evidence

Deliverables:

- Operator execution package generator.
- Upload/record sanitized execution evidence.
- Failure/retry/revision workflow.

Acceptance:

- Operator can execute Fabric CLI/process outside app and record result.
- Failed execution does not corrupt previous proposal state.

### Phase 4 — UI

Deliverables:

- Admin Fabric governance page.
- Channel proposal wizard.
- Invitation acceptance panel.
- Readiness dashboard.
- Audit/evidence links.

Acceptance:

- UI clearly says operator execution is required.
- UI does not imply automatic channel creation unless execution is recorded.

### Phase 5 — Optional automation hardening

Only start if approved:

- Managed secret store.
- Dedicated operator agent.
- Admin key custody policy.
- Channel config signing service.
- Automated submit path.

Acceptance:

- Automation cannot proceed without approved custody/governance policy.

## 13. Test Strategy

### Unit tests

- Proposal lifecycle validation.
- Invitation lifecycle validation.
- Approval threshold evaluation.
- Role/permission checks.
- Evidence sanitizer.
- Readiness status builder.

### Integration tests

- Create channel proposal.
- Invite organization.
- Accept invitation.
- Approve proposal.
- Record operator execution.
- Record operator failure.
- Readiness response.
- Audit events created.
- Unauthorized role rejected.

### E2E/UAT tests

- Admin creates proposal.
- Invited org accepts invitation.
- Platform operator records execution.
- Auditor views evidence.
- Failed proposal revision flow.
- No private key or PEM text appears in DOM.

## 14. Security Guardrails

1. No Fabric admin private key may be stored in the app database.
2. No PEM block may be rendered in UI or evidence docs.
3. No Fabric admin MSP folder may be uploaded as evidence.
4. Operator execution logs must be sanitized before storage.
5. All governance actions require actor, organization, role, and audit context.
6. Proposal retries must create new revisions.
7. App Organization Admin and Fabric Platform Operator authority must remain separate.
8. Production automation requires a new ADR before implementation.

## 15. Recommended First Build Slice

The first implementation slice should be:

> Read-only Fabric channel registry and operator-assisted proposal workflow metadata.

Do not start with real channel creation. Start with records, approvals, readiness, and evidence. This creates product value quickly and keeps the security model manageable.

Suggested first sprint:

1. Add Prisma models for `FabricNetwork`, `FabricChannel`, `FabricChannelMembership`, and `FabricChannelProposal`.
2. Add read-only `GET /api/v1/fabric/channels` and `GET /api/v1/fabric/channels/:id/readiness`.
3. Add `POST /api/v1/fabric/channels` as proposal creation only.
4. Add audit events.
5. Add admin UI page showing that operator execution is required.
6. Add tests proving no direct Fabric topology mutation happens.

## 16. Final Base Decision

MEPN should implement Fabric channel governance as a controlled, auditable, operator-assisted workflow first.

It should not initially implement direct channel creation, peer join, MSP enrollment, or channel config signing inside the app.

This gives the product owner the requested feature path while preserving the project’s security, reviewability, and implementation feasibility.
