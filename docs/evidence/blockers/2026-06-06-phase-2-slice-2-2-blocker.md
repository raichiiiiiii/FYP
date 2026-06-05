# Blocker: Phase 2 Slice 2.2 Live Fabric Gateway Hash Precondition

## Phase

Phase 2 - P0 Real Fabric Proof Screenshots

## Slice

Slice 2.2 - Live Gateway hash precondition

## Feature

Create or locate a live Gateway-anchored hash record that can return
`verified=true` from:

```text
GET /api/v1/hash-records/:id/fabric-verification
```

## Command Attempted

The Azure VM was first redeployed to the current `main` commit:

```bash
gh workflow run deploy-azure-vm.yml --ref main
gh run watch 27043773435 --exit-status
```

Successful deployment workflow run:

```text
https://github.com/raichiiiiiii/FYP/actions/runs/27043773435
```

Then a UAT organization and hash record were created through the public API:

```powershell
POST http://20.244.24.76/api/v1/orgs
POST http://20.244.24.76/api/v1/hash-records
GET  http://20.244.24.76/api/v1/hash-records/{hashRecordId}/fabric-verification?organizationId={organizationId}&actorUserId={actorUserId}
```

Created UAT record identifiers:

```text
organizationId: dd36d97b-fded-4047-9550-dcf2528a8efc
actorUserId: 61177dbf-0b0a-4edc-91a3-643dd779c5b3
actorEmail: fabric-uat-20260606074012@mepn.local
hashRecordId: 4b82c6b9-4ba0-4915-8d2b-b35331d0f4d3
canonicalHash: 2180a09318bda9a74524091f177dc6cda0291da68f1c92e9946b1a200a751c32
```

These identifiers are not secrets. They are included so the proof attempt can be
resumed against the same record after the Gateway runtime issue is fixed.

## Sanitized Error Output

The Fabric verification endpoint returned:

```json
{
  "status": "unavailable",
  "verificationStatus": "FABRIC_UNAVAILABLE",
  "verified": false,
  "transactionIdPresent": false,
  "onChainHashPresent": false,
  "mismatchReason": null,
  "reviewerSummary": "The anchor request reached the integration boundary, but Fabric was unavailable."
}
```

No PEM blocks, private keys, generated env contents, tokens, passwords, or VM
credentials were printed or committed.

## Blocker Type

External Fabric runtime.

The repository implementation and deployed Gateway configuration are present,
but the worker was unable to produce a real Fabric anchor for this hash record.
The API correctly reported `FABRIC_UNAVAILABLE` and did not claim verified proof.

## Implemented Work

- Pushed the Slice 2.1 readiness commit to `origin/main`.
- Redeployed the Azure VM successfully through GitHub Actions run
  `27043773435`.
- Created a reviewer-safe UAT organization and hash record through public API
  calls.
- Confirmed the hash-record Fabric verification endpoint enforces actor context.
- Confirmed the endpoint does not report `verified=true` when Fabric is
  unavailable.

## Remaining Work

- Inspect the deployed worker logs and reconciliation/outbox record for
  `hashRecordId=4b82c6b9-4ba0-4915-8d2b-b35331d0f4d3`.
- Confirm the VM can reach the configured Fabric Gateway peer endpoint.
- Confirm the mounted cert/key/TLS material matches the peer/channel/chaincode
  runtime.
- Confirm `audit-anchor` chaincode is deployed and reachable by the configured
  identity.
- Reprocess or recreate the hash anchor request after Gateway reachability is
  fixed.
- Re-run the Fabric verification endpoint until it returns `verified=true` from
  a successful `ReadAnchor`.
- Only then run the gated Playwright screenshot flow in Slice 2.3.

## Exact Resume Steps

1. Inspect worker logs on the VM without printing secret files:

   ```bash
   cd /opt/mepn
   docker compose \
     -f docker-compose.prod.yml \
     --env-file .env.production \
     --env-file /run/secrets/fabric/env.generated \
     logs --tail=200 worker
   ```

2. Inspect the outbox/reconciliation state for the UAT hash record through
   safe API/database queries. Do not print `.env.production` or Fabric secret
   files.

3. Confirm Gateway network reachability from the worker container to the
   configured peer endpoint.

4. After resolving the Fabric runtime issue, retry:

   ```bash
   curl "http://20.244.24.76/api/v1/hash-records/4b82c6b9-4ba0-4915-8d2b-b35331d0f4d3/fabric-verification?organizationId=dd36d97b-fded-4047-9550-dcf2528a8efc&actorUserId=61177dbf-0b0a-4edc-91a3-643dd779c5b3"
   ```

5. Continue only if the response contains:

   ```json
   {
     "verified": true,
     "status": "verified"
   }
   ```

6. Run the gated screenshot spec with the live ids:

   ```powershell
   $env:FABRIC_GATEWAY_UAT_HASH_RECORD_ID="4b82c6b9-4ba0-4915-8d2b-b35331d0f4d3"
   $env:FABRIC_GATEWAY_UAT_ORGANIZATION_ID="dd36d97b-fded-4047-9550-dcf2528a8efc"
   $env:FABRIC_GATEWAY_UAT_USER_ID="61177dbf-0b0a-4edc-91a3-643dd779c5b3"
   corepack pnpm test:e2e -- tests/e2e/15-fabric-gateway-uat-proof.spec.ts
   ```

## Whether Code Was Committed

Yes. Slice 2.1 was committed and pushed before this live proof attempt:

```text
5c93a91 test(fabric): verify gateway proof api and ui readiness
```

This blocker note is safe to commit.

## Whether Evidence Is Safe To Commit

Yes. This file contains only public API route names, non-secret UAT record ids,
the sanitized unavailable response, and resume instructions. It does not contain
secret values, PEM blocks, tokens, passwords, generated env files, private keys,
or VM credentials.
