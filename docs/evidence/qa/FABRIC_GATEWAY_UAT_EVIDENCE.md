# Fabric Gateway UAT Evidence

## Purpose

This file records reviewer-facing evidence for real Fabric Gateway hash-record
verification. It is not mock-anchor evidence.

## Environment

- Date/time: 2026-06-06T00:18Z
- Public VM: `http://20.244.24.76`
- App runtime commit on VM: `4266b3d`
- Screenshot artifact commit: `220737b`
- Fabric runtime: VM-local Hyperledger Fabric test network for FYP/UAT proof
- Fabric mode: `BLOCKCHAIN_ANCHOR_ADAPTER=fabric`, `FABRIC_MODE=gateway`
- Channel: `mepn-audit`
- Chaincode: `audit-anchor`
- MSP ID: `Org1MSP`
- Identity label: `appUser`
- Peer endpoint from worker container: `peer0.org1.example.com:7051`
- Gateway URL: `grpcs://peer0.org1.example.com:7051`

No PEM blocks, private keys, TLS CA contents, generated env files, tokens, VM
credentials, or secret values are included in this evidence.

## Verified Hash Record

| Field | Value |
|---|---|
| Organization id | `dd36d97b-fded-4047-9550-dcf2528a8efc` |
| Actor user id | `61177dbf-0b0a-4edc-91a3-643dd779c5b3` |
| Hash record id | `34c5a7e7-5bf3-4246-89ae-b51a2e765ef4` |
| Entity type | `FabricGatewayUatProof` |
| Entity id | `fabric-vm-uat-20260606001704` |
| Canonical hash | `0000f960085212868b52937c0a0e5cfbf2e268eb7b28163b7fd347f5219527db` |
| Transaction id | `1b92ddeb54734197ae5cf5e9e0d0cf5ab45d81cd809a5b80301bf06485be20c7` |
| Block number | `6` |
| Verification status | `verified` |
| On-chain verified | `true` |

## Commands

VM-local verification:

```bash
curl -fsS \
  "http://localhost/api/v1/hash-records/34c5a7e7-5bf3-4246-89ae-b51a2e765ef4/fabric-verification?organizationId=dd36d97b-fded-4047-9550-dcf2528a8efc&actorUserId=61177dbf-0b0a-4edc-91a3-643dd779c5b3"
```

Screenshot capture from the local workstation against the VM:

```powershell
$env:E2E_WEB_BASE_URL='http://20.244.24.76'
$env:E2E_API_BASE_URL='http://20.244.24.76/api/v1'
$env:FABRIC_GATEWAY_UAT_HASH_RECORD_ID='34c5a7e7-5bf3-4246-89ae-b51a2e765ef4'
$env:FABRIC_GATEWAY_UAT_ORGANIZATION_ID='dd36d97b-fded-4047-9550-dcf2528a8efc'
$env:FABRIC_GATEWAY_UAT_USER_ID='61177dbf-0b0a-4edc-91a3-643dd779c5b3'
$env:FABRIC_GATEWAY_UAT_ORGANIZATION_NAME='Fabric Gateway VM UAT Organization'
$env:FABRIC_GATEWAY_UAT_USER_EMAIL='fabric-vm-uat@mepn.local'
corepack pnpm exec playwright test tests/e2e/15-fabric-gateway-uat-proof.spec.ts
```

Result:

```text
1 passed
```

## Screenshot Evidence

| Screenshot path | Source | Result |
|---|---|---|
| `docs/evidence/uat/fabric-gateway-hash-record-verification.png` | Playwright against Azure VM | Hash detail page shows Gateway mode and on-chain verification panel. |
| `docs/evidence/uat/fabric-gateway-proof-panel.png` | Playwright against Azure VM | Proof panel shows `On-chain verified: Yes`, transaction metadata, matching hashes, channel, chaincode, MSP ID, and no mock labels. |

## Verification Result

The API returned:

```json
{
  "hashRecordId": "34c5a7e7-5bf3-4246-89ae-b51a2e765ef4",
  "mode": "fabric-gateway",
  "verified": true,
  "status": "verified",
  "localCanonicalHash": "0000f960085212868b52937c0a0e5cfbf2e268eb7b28163b7fd347f5219527db",
  "storedAnchorHash": "0000f960085212868b52937c0a0e5cfbf2e268eb7b28163b7fd347f5219527db",
  "onChainAnchorHash": "0000f960085212868b52937c0a0e5cfbf2e268eb7b28163b7fd347f5219527db",
  "transactionId": "1b92ddeb54734197ae5cf5e9e0d0cf5ab45d81cd809a5b80301bf06485be20c7",
  "blockNumber": "6",
  "channelName": "mepn-audit",
  "chaincodeName": "audit-anchor",
  "mspId": "Org1MSP",
  "identity": "appUser"
}
```

This proves:

- local canonical hash matched the stored HashRecord hash;
- stored `AuditAnchor.rootHash` matched the local canonical hash;
- API-side Fabric Gateway `ReadAnchor` returned the same on-chain hash;
- the worker stored real transaction metadata;
- the outbox event completed in one attempt;
- the UI proof panel did not show mock labels.

## Limitations

- The Fabric runtime is a VM-local test network for FYP/UAT evidence, not a
  regulated production consortium topology.
- This evidence proves one real Gateway hash-record anchor and chaincode
  verification path. Broader production hardening remains tracked separately.
- Do not reuse the VM-local generated identity material as production
  consortium credentials.
