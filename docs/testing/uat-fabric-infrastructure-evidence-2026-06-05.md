# UAT Fabric Infrastructure Evidence - 2026-06-05

## Purpose

This file records local Fabric infrastructure and verification evidence captured
during the PBI-438 Fabric integration pass.

Do not treat this file as a certificate/key store. Certificate bodies, private
keys, and secret file contents were not captured.

## Summary

| Check | Result | Notes |
|---|---|---|
| `go version` | Blocked | Go is not on `PATH` in this Windows shell. Chaincode unit/build-tag validation remains blocked. |
| `docker ps` | Running | Fabric CA, peer, orderer, and `audit-anchor` chaincode containers were running, along with MEPN infra containers. |
| `infra/fabric/scripts/check-prereqs.ps1` | Blocked | Docker, Git, Bash, and Fabric samples test-network were available; Go was missing. |
| `corepack pnpm --dir apps/worker test:integration -- fabric` | Passed | Default command remained mock-safe: mock Fabric suite passed and real Gateway suite was skipped. |
| Gated real Gateway worker integration test | Passed | After loading `infra/fabric/.local/fabric-gateway.env` and setting `FABRIC_TEST_NETWORK_ENABLED=true`, both Fabric integration suites passed. |
| `corepack pnpm test:e2e` | Passed | 18/18 Playwright tests passed. |

## Captured Command Evidence

### `go version`

```text
go : The term 'go' is not recognized as the name of a cmdlet, function, script file, or operable program.
```

Blocker type: local tooling.

### `docker ps`

```text
dev-peer0.org2.example.com-audit-anchor_1.0...   Up   chaincode container
dev-peer0.org1.example.com-audit-anchor_1.0...   Up   chaincode container
orderer.example.com                              Up   ports 7050, 7053, 9443
peer0.org1.example.com                           Up   ports 7051, 9444
peer0.org2.example.com                           Up   ports 9051, 9445
ca_org2                                          Up   ports 8054, 18054
ca_org1                                          Up   ports 7054, 17054
ca_orderer                                       Up   ports 9054, 19054
mepn-redis                                       Up   port 6379
mepn-postgres                                    Up   port 5432
mepn-minio                                       Up   ports 9000-9001
```

### `powershell -NoProfile -ExecutionPolicy Bypass -File infra\fabric\scripts\check-prereqs.ps1`

```text
Name                        Required Available Detail
----                        -------- --------- ------
Docker                          True      True C:\Program Files\Docker\Docker\resources\bin\docker.exe
Git                             True      True C:\Program Files\Git\cmd\git.exe
Bash                            True      True C:\Windows\system32\bash.exe
Go                              True     False go not found on PATH
Fabric samples test-network     True      True C:\Users\User\dev\FYP\infra\fabric\.local\fabric-samples\test-network\network.sh

Missing required Fabric local-network prerequisites: Go
```

Blocker type: local tooling.

### `corepack pnpm --dir apps/worker test:integration -- fabric`

```text
Test Suites: 1 skipped, 1 passed, 1 of 2 total
Tests:       1 skipped, 1 passed, 2 total
Ran all test suites matching fabric.
```

Interpretation: normal/default worker integration command is deterministic and
mock-safe. Real Gateway test remains gated unless
`FABRIC_TEST_NETWORK_ENABLED=true` is explicitly set.

### Gated Real Gateway Worker Integration Test

Command pattern:

```powershell
# Loaded infra\fabric\.local\fabric-gateway.env into process env.
$env:FABRIC_TEST_NETWORK_ENABLED = "true"
corepack pnpm --dir apps/worker test:integration -- fabric
```

Output:

```text
Test Suites: 2 passed, 2 total
Tests:       2 passed, 2 total
Ran all test suites matching fabric.
```

Interpretation: the worker Gateway integration test reached the real Gateway
path, processed a hash-only Fabric anchor request, stored reconciliation/audit
anchor metadata, and queried `ReadAnchor` for the on-chain hash.

This is repository-level local Fabric evidence. It does not remove the separate
`go version` blocker for chaincode unit/build-tag validation.

### `corepack pnpm test:e2e`

```text
Running 18 tests using 1 worker
18 passed
```

E2E coverage includes the hash-detail Fabric evidence-state screen. The E2E
verified state remains a seeded stored-metadata state, not live on-chain proof.

## Redacted Gateway Environment

Source file inspected:

```text
infra\fabric\.local\fabric-gateway.env
```

Redacted content:

```text
FABRIC_ENABLED=true
FABRIC_MODE=gateway
FABRIC_GATEWAY_URL=grpcs://localhost:7051
FABRIC_MSP_ID=Org1MSP
FABRIC_CHANNEL=mepn-audit
FABRIC_CHAINCODE=audit-anchor
FABRIC_IDENTITY_CERT_PATH=<redacted local path>\deploy\fabric\client.crt
FABRIC_PRIVATE_KEY_PATH=<redacted local path>\deploy\fabric\client.key
FABRIC_TLS_CERT_PATH=<redacted local path>\deploy\fabric\ca.crt
FABRIC_PEER_ENDPOINT=localhost:7051
FABRIC_GATEWAY_HOST_ALIAS=peer0.org1.example.com
FABRIC_SUBMIT_TIMEOUT_MS=30000
FABRIC_COMMIT_TIMEOUT_MS=30000
```

No certificate or private key contents were recorded.

## Remaining Blockers

| Blocker | Type | Required action |
|---|---|---|
| Go not on `PATH` | Local tooling | Install Go or expose the existing Go binary to PowerShell, then run `go version` and chaincode tests. |
| Chaincode unit/build-tag validation not run | Local tooling / repository verification | Run `go test ./...` and `go test -tags fabric ./...` in `chaincode/audit-anchor-go`. |
| Browser screenshot evidence for real Gateway state not captured | UAT evidence | Capture reviewer screenshots after running the real Gateway path and loading a real hash record in the web UI. |

## Post-Run Cleanup

The local Fabric test network was stopped with:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File infra\fabric\scripts\stop-local-network.ps1
```

The script removed Fabric peer, orderer, CA, and generated chaincode containers.
It printed non-fatal Docker volume lookup errors for already-removed volumes.

After cleanup, `docker ps` showed only MEPN local infrastructure containers:

```text
mepn-redis
mepn-postgres
mepn-minio
```
