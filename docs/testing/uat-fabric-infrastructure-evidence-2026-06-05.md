# UAT Fabric Infrastructure Evidence - 2026-06-05

## Purpose

This file records local Fabric infrastructure and verification evidence captured
during the PBI-438 Fabric integration pass.

Do not treat this file as a certificate/key store. Certificate bodies, private
keys, and secret file contents were not captured.

## Summary

| Check | Result | Notes |
|---|---|---|
| `go version` | Passed | `go version go1.26.4 windows/amd64` after prepending `C:\Program Files\Go\bin` to the command PATH. |
| `go test ./...` | Passed | Pure chaincode validation passed under `chaincode/audit-anchor-go`. |
| `go test -tags fabric ./...` | Passed | Fabric Contract API wrapper validation passed under `chaincode/audit-anchor-go`. |
| `docker ps` | Running | Fabric CA, peer, orderer, and `audit-anchor` chaincode containers were running during the proof run, along with MEPN infra containers. |
| `infra/fabric/scripts/check-prereqs.ps1` | Passed | Docker, Git, Bash, Go, and Fabric samples test-network were available. |
| `infra/fabric/scripts/start-local-network.ps1` | Passed | Channel `mepn-audit` was created and `audit-anchor` was deployed. |
| `infra/fabric/scripts/export-gateway-env.ps1` | Passed | Gateway material was copied to `deploy/fabric` and ignored env material was written without printing cert/key contents. |
| `corepack pnpm --dir apps/worker test:integration -- fabric` | Passed | Default command remained mock-safe: mock Fabric suite passed and real Gateway suite was skipped. |
| Gated real Gateway worker integration test | Passed | After loading `infra/fabric/.local/fabric-gateway.env` and setting `FABRIC_TEST_NETWORK_ENABLED=true`, both Fabric integration suites passed, including duplicate same-hash reconciliation. |
| `corepack pnpm test:e2e` | Passed | 18/18 Playwright tests passed. |

## Captured Command Evidence

### `go version`

```text
go version go1.26.4 windows/amd64
```

Note: the Codex PowerShell process needed `C:\Program Files\Go\bin` prepended
to `PATH` for this run.

### Chaincode Validation

Commands:

```powershell
go test ./...
go test -tags fabric ./...
```

Output:

```text
ok  	github.com/raichiiiiiii/FYP/chaincode/audit-anchor-go	(cached)
ok  	github.com/raichiiiiiii/FYP/chaincode/audit-anchor-go	1.248s
```

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
Go                              True      True C:\Program Files\Go\bin\go.exe
Fabric samples test-network     True      True C:\Users\User\dev\FYP\infra\fabric\.local\fabric-samples\test-network\network.sh
```

### Local Network Startup And Gateway Export

Commands:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File infra\fabric\scripts\start-local-network.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File infra\fabric\scripts\export-gateway-env.ps1
```

Result:

```text
Fabric local test network is running.
Channel: mepn-audit
Chaincode: audit-anchor
Copied local Fabric Gateway material to deploy\fabric.
Wrote ignored local env file: C:\Users\User\dev\FYP\infra\fabric\.local\fabric-gateway.env
No certificate or private key contents were printed.
```

The start script also emitted non-fatal Docker volume lookup messages for
already-removed volumes during cleanup.

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
anchor metadata, queried `ReadAnchor` for the on-chain hash, then submitted a
duplicate same-anchor/same-hash command and verified the reconciled on-chain
anchor.

This is repository-level local Fabric evidence. API-side direct chaincode
verification and reviewer UI screenshots remain separate TODOs.

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
| API-side direct chaincode verification not implemented | Repository implementation | Add a safe API query path that compares local canonical hash evidence to on-chain `ReadAnchor` evidence. |
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
