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

Follow-up diagnosis used only public status APIs and sanitized VM inspection:

```powershell
curl -fsS "http://20.244.24.76/api/v1/integrations/fabric/status"
curl -fsS "http://20.244.24.76/api/v1/integrations/workers"
curl -fsS "http://20.244.24.76/api/v1/integrations/outbox?organizationId=dd36d97b-fded-4047-9550-dcf2528a8efc"
curl -fsS "http://20.244.24.76/api/v1/integrations/reconciliation?organizationId=dd36d97b-fded-4047-9550-dcf2528a8efc"
curl -fsS "http://20.244.24.76/api/v1/hash-records/4b82c6b9-4ba0-4915-8d2b-b35331d0f4d3/fabric-verification?organizationId=dd36d97b-fded-4047-9550-dcf2528a8efc&actorUserId=61177dbf-0b0a-4edc-91a3-643dd779c5b3"
```

```bash
ssh -i ./vm-mepn-fyp-key.pem azureuser@20.244.24.76
cd /opt/mepn
docker compose -f docker-compose.prod.yml --env-file .env.production --env-file /run/secrets/fabric/env.generated ps
bash scripts/validate-fabric-secrets.sh /run/secrets/fabric
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

The outbox/reconciliation diagnosis showed the actual worker failure:

```text
outbox status: FAILED
outbox attempts: 5
reconciliation status: FABRIC_UNAVAILABLE
lastError: 14 UNAVAILABLE: No connection established. Last error: Error: connect ECONNREFUSED 127.0.0.1:7051.
```

Safe VM checks showed:

```text
docker compose ps: API, frontend, reverse proxy, worker, PostgreSQL, Redis, and MinIO are running.
worker heartbeat: healthy/idle, processedCount=0, failedCount=5.
Fabric integration status: gateway mode configured, no missing gateway config.
Fabric secret validation: passed for /run/secrets/fabric without printing contents.
worker/API mounted Fabric secret files: present.
worker Fabric env keys: all required keys are set.
```

The existing smoke script also revealed a repository script gap after Slice 2.1:

```text
Hash record Fabric verification:
curl: (22) The requested URL returned error: 403
```

Cause: `scripts/smoke/fabric-gateway-smoke.sh` passed `HASH_RECORD_ID` without
the now-required `organizationId` and `actorUserId` query parameters. This was
fixed in the repository by adding
`HASH_RECORD_ORGANIZATION_ID`/`ORGANIZATION_ID` and
`HASH_RECORD_ACTOR_USER_ID`/`ACTOR_USER_ID` support.

No PEM blocks, private keys, generated env contents, tokens, passwords, or VM
credentials were printed or committed.

## Blocker Type

External Fabric runtime plus one local smoke-script follow-up.

The repository implementation and deployed Gateway configuration are present,
but the worker was unable to produce a real Fabric anchor for this hash record.
The API correctly reported `FABRIC_UNAVAILABLE` and did not claim verified
proof. The concrete runtime failure is that the worker attempted to connect to
`127.0.0.1:7051` from inside the worker container and received
`ECONNREFUSED`.

Root-cause classification:

```text
5. Peer endpoint unreachable
```

The configured Fabric peer endpoint is loopback from the worker container's
perspective. On the Azure VM this means the worker is trying to reach Fabric
inside itself, not a reachable Fabric peer/gateway runtime. This should be fixed
by changing the deployed Fabric endpoint configuration or making a real Fabric
peer/gateway reachable from the VM/container. Do not replace this with mock
anchoring.

## Implemented Work

- Pushed the Slice 2.1 readiness commit to `origin/main`.
- Redeployed the Azure VM successfully through GitHub Actions run
  `27043773435`.
- Created a reviewer-safe UAT organization and hash record through public API
  calls.
- Confirmed the hash-record Fabric verification endpoint enforces actor context.
- Confirmed the endpoint does not report `verified=true` when Fabric is
  unavailable.
- Confirmed public outbox/reconciliation status contains the concrete failure:
  `ECONNREFUSED 127.0.0.1:7051`.
- Confirmed VM Fabric secret files and required env keys are present without
  printing secret contents.
- Fixed `scripts/smoke/fabric-gateway-smoke.sh` so hash-record verification
  accepts organization and actor context.

## Remaining Work

- Update the deployed Fabric endpoint configuration so the worker does not use
  loopback (`127.0.0.1:7051`) unless a real Fabric peer/gateway is actually
  running inside the same worker container.
- Confirm the VM/container can reach the configured Fabric Gateway peer
  endpoint.
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

3. Fix the deployed Fabric endpoint configuration. The previous worker attempt
   failed with `ECONNREFUSED 127.0.0.1:7051`, so `FABRIC_PEER_ENDPOINT` must
   point to a reachable Fabric peer/gateway from inside the worker container.

4. If using the smoke script, include actor context:

   ```bash
   APP_BASE_URL=http://localhost \
   HASH_RECORD_ID=4b82c6b9-4ba0-4915-8d2b-b35331d0f4d3 \
   HASH_RECORD_ORGANIZATION_ID=dd36d97b-fded-4047-9550-dcf2528a8efc \
   HASH_RECORD_ACTOR_USER_ID=61177dbf-0b0a-4edc-91a3-643dd779c5b3 \
     bash scripts/smoke/fabric-gateway-smoke.sh
   ```

5. After resolving the Fabric runtime issue, retry:

   ```bash
   curl "http://20.244.24.76/api/v1/hash-records/4b82c6b9-4ba0-4915-8d2b-b35331d0f4d3/fabric-verification?organizationId=dd36d97b-fded-4047-9550-dcf2528a8efc&actorUserId=61177dbf-0b0a-4edc-91a3-643dd779c5b3"
   ```

6. Continue only if the response contains:

   ```json
   {
     "verified": true,
     "status": "verified"
   }
   ```

7. Run the gated screenshot spec with the live ids:

   ```powershell
   $env:FABRIC_GATEWAY_UAT_HASH_RECORD_ID="4b82c6b9-4ba0-4915-8d2b-b35331d0f4d3"
   $env:FABRIC_GATEWAY_UAT_ORGANIZATION_ID="dd36d97b-fded-4047-9550-dcf2528a8efc"
   $env:FABRIC_GATEWAY_UAT_USER_ID="61177dbf-0b0a-4edc-91a3-643dd779c5b3"
   corepack pnpm test:e2e -- tests/e2e/15-fabric-gateway-uat-proof.spec.ts
   ```

## Validation After Follow-Up Diagnosis

```text
bash -n scripts/smoke/fabric-gateway-smoke.sh: passed
corepack pnpm lint: passed
corepack pnpm typecheck: passed
git diff --check: passed
corepack pnpm test:unit: passed
corepack pnpm build: passed
patched public smoke script with organization/actor context: passed and reproduced `status=unavailable`
corepack pnpm test:integration: failed
```

The integration failure reproduced when run by itself. It is not caused by the
smoke-script/docs change in this blocker follow-up. The failing API integration
tests are:

```text
test/integration/finance.integration.spec.ts: expected opportunity creation 201, got 400
test/integration/graph.integration.spec.ts: expected opportunity creation 201, got 400
```

Those failures should be handled separately from the deployed Fabric Gateway
runtime blocker. They occur before the smoke script or live hash-record
verification path is involved.

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
