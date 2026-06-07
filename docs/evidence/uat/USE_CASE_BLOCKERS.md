# SRS Use Case UAT Blockers

Last updated: 2026-06-07

This file records known execution gaps for the SRS use case simulation. It does
not claim that a seeded route screenshot proves a full business mutation unless
the corresponding UI/API path exists and is exercised by the test.

## Cross-Cutting Blockers And Limitations

| ID | Area | Severity | Status | Notes | Recommended Fix |
|---|---|---:|---|---|---|
| UAT-B-001 | Role model | Medium | Accepted MVP limitation | `Role.code` is globally unique and each membership has one `roleId`. Current MVP assigns one primary role per user per organization. | Add organization-scoped roles and membership role assignments in a later schema migration. |
| UAT-B-002 | Authentication | Medium | Resolved for local UAT | Seeded accounts store `passwordHash` and can now authenticate through local seeded-password login when local password auth is enabled. This is local/demo behavior, not production credential policy. | Use `password` only for local/UAT seeded accounts. Production deployments should use OIDC or an approved identity boundary unless `LOCAL_PASSWORD_AUTH_ENABLED=true` is explicitly accepted. |
| UAT-B-003 | Fabric topology | High | Resolved by accepted boundary decision | MEPN records governance metadata, invitations, approvals, readiness checks, and sanitized operator evidence only. Direct API channel creation, channel joining, MSP onboarding, admin key custody, and real topology mutation are intentionally not implemented in the app runtime. | Use `GET /api/v1/fabric/uat-blocker-decisions` and `GET /api/v1/fabric/automation/readiness` as reviewer evidence. Future direct automation requires a separate operator-agent implementation and disposable real-Fabric tests. |
| UAT-B-004 | Fabric proof | High | Resolved by live-proof gate; environment evidence pending | Seeded hash and anchor metadata must not be treated as real Fabric verification. Positive verification requires backend ReadAnchor chaincode query and hash comparison. | Use the decision endpoint to verify local seed cannot pass real proof. Configure live Fabric Gateway, create/locate a real anchored hash record, and run the gated proof UAT when real proof evidence is required. |
| UAT-B-005 | Cross-node collaboration | Medium | Partial | The seed creates multiple organization nodes, but some workflows are represented in one local operational database for UAT visibility. | Add inter-node API invitation/workspace flows and explicit cross-node synchronization contracts. |
| UAT-B-006 | Release/update node lifecycle | Medium | Hardening | UC-16 is currently evidenced through setup/update docs, operations visibility, backup/restore scripts, and readiness surfaces. Full release manifest/update execution UI is not yet implemented. | Add release manifest parser, preflight result persistence, upgrade run records, and rollback evidence UI. |
| UAT-B-007 | Node/channel compatibility | Medium | Resolved for local UAT | UC-18 now probes `GET /api/v1/node/status` for self-hosted node status, Prisma migration status, app/API/report/canonical-hash compatibility labels, feature flags, and Fabric readiness linkage. The endpoint deliberately reports `topologyMutationSupported=false`. | Keep this endpoint as a compatibility/readiness surface. Add richer release-manifest and channel-package validation only in a later hardening slice. |

## Use-Case Execution Notes

| Use case | Current UAT behavior | Blocker handling |
|---|---|---|
| UC-01 | Route-backed through organization profile and operations/health visibility. | None if route renders. |
| UC-02 | Route-backed through seeded-password login, dev session fallback, and role-aware navigation. | Seeded local password login is tested for UAT only; production OIDC remains hardening unless configured. |
| UC-03 | Route-backed supplier list/detail evidence where available. | Implement supplier detail/edit route if deeper document review is required. |
| UC-04 | Route-backed RFQ/quotation evidence where available. | Implement richer quotation comparison UI if award recommendation mutation is required. |
| UC-05 | Route-backed purchase order, receipt, invoice, and matching evidence where available. | Implement missing receipt/invoice mutation UI if route is read-only. |
| UC-06 | Route-backed opportunity visibility. | Supplier-owned cross-node publishing remains partial. |
| UC-07 | Route-backed application visibility. | End-to-end supplier submission may be read-only/seed-backed. |
| UC-08 | Route-backed application/due diligence visibility. | If reviewer mutation controls are missing, keep as partial and implement workflow actions. |
| UC-09 | Route-backed application/Shariah visibility. | If reviewer mutation controls are missing, keep as partial and implement workflow actions. |
| UC-10 | Route-backed contracts/disbursement visibility. | Real e-signature and payment API execution remain external integration hardening. |
| UC-11 | Route-backed ledger/project monitoring visibility. | Evidence request mutation can be added if required. |
| UC-12 | Route-backed profit/loss and closure visibility. | Profit distribution must remain ratio-based; no fixed return logic is allowed. |
| UC-13 | Route-backed graph canvas visibility. | Preserve graph role no-leak behavior. |
| UC-14 | Route-backed evidence/hash visibility. | Fabric Gateway unavailable must show pending/unavailable, not verified. |
| UC-15 | Route-backed integrations/reconciliation visibility. | Real ERP adapter remains integration hardening unless configured. |
| UC-16 | Documentation/operations-backed. | Full release package update UI is hardening. |
| UC-17 | Governance/readiness-backed and API-backed through `GET /api/v1/fabric/uat-blocker-decisions`. | Real topology mutation is intentionally outside the app runtime. |
| UC-18 | Route-backed and API-backed through `/fabric-governance` plus `GET /api/v1/node/status`. | Node status covers local UAT compatibility visibility and links the accepted Fabric blocker decision surface. Production release package execution and real Fabric topology mutation remain separate hardening/boundary items. |

## Latest Diagnosis And Fix Log

2026-06-07:

- Diagnosed UAT-B-001 through UAT-B-006 as either accepted MVP limitations, intentional Fabric/Fabric-proof boundaries, or larger product-hardening work.
- Implemented UAT-B-007 because it was a concrete missing API surface required by UC-18.
- Added `GET /api/v1/node/status`.
- Added unit and integration coverage for the node status response.
- Updated the UC-18 UAT probe so the use-case simulation checks `/node/status` in addition to rendering the Fabric governance route.
- The endpoint returns only safe compatibility/status fields and does not return Fabric endpoint URLs, private keys, PEM blocks, tokens, passwords, or raw environment values.

2026-06-07 follow-up:

- Implemented local seeded-password login for UAT accounts through `/api/v1/auth/password-login`.
- Kept the existing dev login path available for local recovery and existing deterministic tests.
- Added `docs/evidence/uat/seeded-node-accounts.txt` as the reviewer account reference.
- Added `docs/adr/ADR-016-uat-fabric-blocker-resolution-path.md` to define the decision path for UAT-B-003 and UAT-B-004.
- Documented UAT-B-003 as intentionally unresolved until a topology-boundary decision was accepted.
- Documented UAT-B-004 as environment-gated unless a live Fabric Gateway `ReadAnchor` proof is captured.

2026-06-07 decision implementation:

- Accepted ADR-015 as the current Fabric topology automation boundary.
- Accepted ADR-016 as the UAT blocker resolution decision.
- Implemented `GET /api/v1/fabric/uat-blocker-decisions`.
- UAT-B-003 is resolved as an accepted product boundary: operator-assisted governance is implemented, direct topology mutation is not.
- UAT-B-004 is resolved as a live-proof gate: local seeded data cannot pass real Fabric proof, and `verified=true` remains available only through live `ReadAnchor` hash comparison.
- Added the decision summary to `GET /api/v1/node/status`.

2026-06-07 decision hardening:

- Expanded the UAT-B-003/UAT-B-004 decision response with explicit safety flags: `directFabricExecutionSupported=false`, `seededProofAccepted=false`, and `readAnchorRequired=true` for real proof.
- Surfaced the same decision flags through `GET /api/v1/node/status` for UC-18 compatibility review.
- Aligned seeded local account evidence and tests to the current local demo password: `password`.

2026-06-07 local federation implementation:

- Kept the UAT-B-003 decision intact: direct Fabric channel creation, real channel join, MSP onboarding, admin key custody, and topology mutation remain outside the normal MEPN runtime.
- Implemented ADR-017 local node-federation simulation APIs for reviewer/UAT flows:
  - `GET /api/v1/node-federation/status`
  - `GET /api/v1/node-federation/peers`
  - `POST /api/v1/node-federation/peers`
  - `POST /api/v1/node-federation/peers/:peerId/ping`
  - `GET /api/v1/node-federation/channels`
  - `POST /api/v1/node-federation/channels`
  - `POST /api/v1/node-federation/channels/:channelId/invite`
  - `POST /api/v1/node-federation/invitations/:invitationId/accept`
  - `POST /api/v1/node-federation/events`
  - `GET /api/v1/node-federation/canvas`
- Added local persistence for `NodeDeployment`, `NodePeer`, `NodeChannel`, `NodeChannelMembership`, `OutboundNodeEvent`, and `InboundNodeEvent`.
- Updated the UAT seed so each self-hosted organization node has a persisted `NodeDeployment`.
- The local event endpoint uses a local shared-secret boundary and rejects secret-like payloads. This is local/UAT transport only, not production Fabric operator automation.
- UAT-B-004 remains protected by the live-proof gate. Node-federation channels do not produce `verified=true`; real verification still requires backend `ReadAnchor` hash comparison.

2026-06-07 organization-admin identity hardening:

- Kept UAT-B-001's accepted MVP limitation: `Role.code` is still globally
  unique and each membership has one primary role.
- Hardened current MVP behavior so user, role, and membership administration is
  restricted to an active same-organization `ORG_ADMIN`.
- `GET /api/v1/users`, `GET /api/v1/roles`, and
  `GET /api/v1/orgs/:orgId/memberships` now require scoped admin context.
- `POST /api/v1/memberships` now rejects assignment of a user already
  registered under another organization.
- This resolves the local multi-node requirement that organization admins
  cannot assign roles to users from another node/organization within the current
  one-role MVP model.

2026-06-07 sidebar visibility override implementation:

- Added per-user sidebar visibility overrides for same-organization users.
- Admins can save route visibility toggles from `/admin/users`.
- Non-admin sidebars are computed from route authorization plus the saved admin
  toggle state.
- `ORG_ADMIN` keeps full sidebar access by default.
- Sidebar hiding remains a navigation preference only; backend authorization and
  route guards remain authoritative.

2026-06-07 Fabric blocker decision UI implementation:

- Confirmed the accepted decision for UAT-B-003: MEPN implements
  operator-assisted Fabric governance metadata/readiness/evidence and does not
  implement direct API channel creation, channel joining, MSP onboarding, admin
  key custody, or real topology mutation.
- Confirmed the accepted decision for UAT-B-004: seeded/local metadata cannot
  pass as real Fabric proof; `verified=true` remains gated by API-side
  chaincode `ReadAnchor` hash comparison.
- Extended `/fabric-governance` to fetch and display
  `GET /api/v1/fabric/uat-blocker-decisions`.
- Extended `/fabric-governance` to fetch and display
  `GET /api/v1/fabric/automation/readiness`.
- The UI now shows the boundary to reviewers without adding unsafe Fabric
  execution actions or weakening proof truth rules.
