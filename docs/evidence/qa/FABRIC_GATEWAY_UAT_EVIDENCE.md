# Fabric Gateway UAT Evidence

## Purpose

This file records reviewer-facing evidence for real Fabric Gateway hash-record
verification. It must not be used for mock anchor evidence.

## Environment

- Date/time: Pending live Gateway screenshot run
- Commit SHA: Pending live Gateway screenshot run
- Environment: Azure VM or local Fabric test network
- Fabric mode: `BLOCKCHAIN_ANCHOR_ADAPTER=fabric`, `FABRIC_MODE=gateway`
- Channel: Configured at runtime; do not paste secrets or generated env files
- Chaincode: Configured at runtime; do not paste secrets or generated env files
- MSP ID: Configured at runtime; do not paste secrets or generated env files

## Readiness Status

The API and UI are ready for a real Gateway screenshot run:

- `GET /api/v1/hash-records/:id/fabric-verification` exists.
- The endpoint requires `organizationId` and `actorUserId` query context for an
  active actor with audit-read capability.
- The API returns `verified=true` only after a successful chaincode `ReadAnchor`
  query and matching local, stored-anchor, and on-chain hashes.
- The web hash detail page calls the endpoint with the current session actor
  context.
- The proof panel renders Gateway mode, channel, chaincode, MSP ID, identity,
  endpoint, transaction ID, block number if present, local hash, stored anchor
  hash, on-chain hash, mismatch/unavailable reason, and mock/pending/failed
  states.
- The gated Playwright proof spec now skips unless the live hash record id,
  organization id, and user id are all provided.

Latest readiness validation:

```bash
corepack pnpm --dir apps/api test -- hash-records
corepack pnpm --dir apps/api test:integration -- evidence
corepack pnpm --dir apps/web test
corepack pnpm typecheck
corepack pnpm lint
```

## Commands

```bash
corepack pnpm test:e2e -- tests/e2e/15-fabric-gateway-uat-proof.spec.ts
```

Required environment values:

```text
FABRIC_GATEWAY_UAT_HASH_RECORD_ID
FABRIC_GATEWAY_UAT_ORGANIZATION_ID
FABRIC_GATEWAY_UAT_USER_ID
```

The provided organization/user must exist in the backend and the user must have
audit-read capability in that organization. Placeholder ids are not accepted for
real proof screenshots.

## Screenshot Evidence

| Screenshot path | Source | Expected result |
| --- | --- | --- |
| `docs/evidence/uat/fabric-gateway-hash-record-verification.png` | Pending Playwright gated UAT flow | Hash detail page shows Gateway mode and on-chain verification panel. |
| `docs/evidence/uat/fabric-gateway-proof-panel.png` | Pending Playwright gated UAT flow | Proof panel shows `On-chain verified: Yes`, transaction metadata, hashes, channel, chaincode, MSP ID, and no mock labels. |


## Verification Result

- Latest readiness status: API/UI proof path is implemented and protected by
  actor context, but live Gateway proof is blocked.
- Latest live attempt date: 2026-06-06.
- Latest live attempt environment: Azure VM at `20.244.24.76`.
- Latest live attempt hash record id:
  `4b82c6b9-4ba0-4915-8d2b-b35331d0f4d3`.
- Local canonical hash matches stored HashRecord: Not verified in screenshot
  flow because the live Gateway proof precondition failed.
- Stored AuditAnchor hash matches local canonical hash: Not verified; no real
  transaction metadata was produced for the live attempt.
- `ReadAnchor` returned the same canonical hash: Not verified; API returned
  `status=unavailable`.
- Real transaction ID present: No.
- Block number present if available: No.
- Mock labels absent: Pending screenshot run.

Latest live endpoint result:

```json
{
  "status": "unavailable",
  "verificationStatus": "FABRIC_UNAVAILABLE",
  "verified": false,
  "transactionIdPresent": false,
  "onChainHashPresent": false,
  "reviewerSummary": "The anchor request reached the integration boundary, but Fabric was unavailable."
}
```

Blocker record:

```text
docs/evidence/blockers/2026-06-06-phase-2-slice-2-2-blocker.md
```

## Notes

- `verified=true` is valid only when the API returned a successful chaincode
  `ReadAnchor` result and all compared hashes matched.
- Do not paste certificate, private key, TLS CA, or generated env-file contents
  into this document.
- If the Gateway runtime is unavailable, record the failure as unavailable
  rather than substituting mock proof.

## Remaining Limitations

- A reviewer-facing real Gateway screenshot requires a live hash record that was
  anchored through Fabric Gateway mode and returns `verified=true` from
  `ReadAnchor`. The latest Azure VM attempt returned `FABRIC_UNAVAILABLE`, so
  the screenshot flow must not run yet.
- Seeded/mock Fabric states remain valid for UI behavior coverage only and must
  not be presented as proof of real on-chain anchoring.
