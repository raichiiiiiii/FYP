# Fabric Gateway UAT Evidence

## Purpose

This file records reviewer-facing evidence for real Fabric Gateway hash-record
verification. It must not be used for mock anchor evidence.

## Environment

- Date/time:
- Commit SHA:
- Environment: Azure VM or local Fabric test network
- Fabric mode: `BLOCKCHAIN_ANCHOR_ADAPTER=fabric`, `FABRIC_MODE=gateway`
- Channel:
- Chaincode:
- MSP ID:

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

## Screenshot Evidence

| Screenshot | Source | Expected result |
| --- | --- | --- |
| ![Hash Verification](./docs/evidence/uat/fabric-gateway-hash-record-verification.png) | Playwright gated UAT flow | Hash detail page shows Gateway mode and on-chain verification panel. |
| ![Proof Panel](./docs/evidence/uat/fabric-gateway-proof-panel.png) | Playwright gated UAT flow | Proof panel shows `On-chain verified: Yes`, transaction metadata, hashes, channel, chaincode, MSP ID, and no mock labels. |


## Verification Result

- Latest repository E2E status: `corepack pnpm test:e2e` passed with this
  real Gateway UAT spec skipped because `FABRIC_GATEWAY_UAT_HASH_RECORD_ID` was
  not set.
- Local canonical hash matches stored HashRecord: Pending live Gateway UAT run.
- Stored AuditAnchor hash matches local canonical hash: Pending live Gateway UAT run.
- `ReadAnchor` returned the same canonical hash: Pending live Gateway UAT run.
- Real transaction ID present: Pending live Gateway UAT run.
- Block number present if available: Pending live Gateway UAT run.
- Mock labels absent: Pending live Gateway UAT run.

## Notes

- `verified=true` is valid only when the API returned a successful chaincode
  `ReadAnchor` result and all compared hashes matched.
- Do not paste certificate, private key, TLS CA, or generated env-file contents
  into this document.
- If the Gateway runtime is unavailable, record the failure as unavailable
  rather than substituting mock proof.

## Remaining Limitations

- A reviewer-facing real Gateway screenshot requires a live hash record that was
  anchored through Fabric Gateway mode. Provide that record through
  `FABRIC_GATEWAY_UAT_HASH_RECORD_ID` before running the gated Playwright spec.
- Seeded/mock Fabric states remain valid for UI behavior coverage only and must
  not be presented as proof of real on-chain anchoring.
