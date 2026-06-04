# Local Fabric Test Network Plan

## Purpose

This guide defines the expected local Fabric test-network setup for MEPN real
Gateway integration work.

It is a plan and operating guide. The repository does not yet include runnable
chaincode or a real Gateway adapter.

## Prerequisites

Install these outside the repository:

- Docker Engine or Docker Desktop
- Hyperledger Fabric samples/test-network
- Fabric binaries matching the selected Fabric version
- Go, Node.js, or another chaincode runtime selected for the chaincode slice

The current Windows development environment used for this repository did not
have the `go` command available during this pass, so chaincode source and tests
were not added.

## Repository Boundary

Do not commit generated Fabric runtime material:

```text
crypto-config/
organizations/
channel-artifacts/
system-genesis-block/
*.pem
*.key
*.crt
*.csr
*.srl
ledger/
wallet/
connection-profile*.json
```

Use committed docs and configuration only. Runtime identities belong in private
local paths or the VM-side `deploy/fabric/` mount, depending on environment.

## Expected Test Network Shape

The first MEPN Fabric test network should provide:

| Item | Required value |
|---|---|
| Channel | Dedicated audit/evidence channel, for example `mepn-audit`. |
| Chaincode | Hash-only audit anchor chaincode. |
| MSP ID | Test organization MSP, for example `Org1MSP`. |
| Gateway endpoint | Test peer or Gateway endpoint reachable from worker. |
| TLS cert | Test CA certificate mounted into worker. |
| Client identity | Test client certificate/private key with invoke permission. |

## Chaincode Contract Boundary

The chaincode must store hashes and minimal metadata only:

```text
anchorId
organizationId
entityType
entityId
canonicalHash
hashAlgorithm
submittedBy
submittedAt
```

It must not store:

- procurement document payloads
- finance application payloads
- invoices
- contracts
- private keys
- PII or confidential commercial details
- full evidence pack JSON

## Adapter Test Flow

Once the chaincode and Gateway adapter exist, run this flow:

1. Start PostgreSQL, Redis, MinIO, API, and worker.
2. Start the Fabric test network.
3. Deploy the hash-only chaincode.
4. Set `FABRIC_ENABLED=true` and `FABRIC_MODE=gateway`.
5. Configure:

```env
FABRIC_GATEWAY_URL=
FABRIC_MSP_ID=
FABRIC_CHANNEL=
FABRIC_CHAINCODE=
FABRIC_IDENTITY_CERT_PATH=
FABRIC_PRIVATE_KEY_PATH=
FABRIC_TLS_CERT_PATH=
FABRIC_PEER_ENDPOINT=
FABRIC_GATEWAY_HOST_ALIAS=
```

6. Create a hash record through the API/UI.
7. Confirm `FABRIC_ANCHOR_REQUESTED` is queued.
8. Confirm the worker submits the anchor to chaincode.
9. Confirm reconciliation records store real transaction/commit metadata.
10. Confirm UI states show submitted/verified only when backend metadata exists.

## Required Tests After Network Exists

- Chaincode unit tests for create/read/verify anchor.
- Worker adapter unit tests with mocked SDK client.
- Worker/outbox integration test against local Fabric test network.
- API integration test for anchor/reconciliation metadata.
- Playwright test showing mock, pending, failed, unavailable, and verified
  Fabric states.

## Stop Condition

Do not enable `FABRIC_MODE=gateway` for demos unless:

- chaincode is deployed
- Gateway credentials are mounted
- worker adapter is implemented
- integration tests pass
- UI shows real transaction metadata distinctly from mock adapter evidence
