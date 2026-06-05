# Audit Anchor Chaincode

This folder contains the first MEPN Fabric chaincode baseline for audit anchors.

## Purpose

The contract stores hash-only audit anchor records. It must not store document
contents, canonical JSON bodies, contract terms, invoice contents, payment data,
private keys, certificates, or secret paths.

## Contract

Chaincode name:

```text
audit-anchor
```

Default local development channel:

```text
mepn-audit
```

Minimum functions:

```text
CreateAnchor(anchorId, organizationId, entityType, entityId, canonicalHash, timestamp, idempotencyKey, metadataJson)
ReadAnchor(anchorId)
FindAnchorByHash(canonicalHash)
AnchorExists(anchorId)
```

## Idempotency

The worker and chaincode use deterministic IDs:

```text
idempotencyKey = fabric:{organizationId || global}:{entityType}:{entityId}:{canonicalHash}
anchorId = sha256(idempotencyKey)
```

Submitting the same anchor ID, idempotency key, and canonical hash returns the
existing anchor. Submitting the same anchor ID with different hash or idempotency
data fails as a conflict.

## Testing

The pure chaincode validation/idempotency core uses only the Go standard
library:

```bash
go test ./...
```

The Fabric contract wrapper is behind the `fabric` build tag. After the local
Fabric toolchain and Fabric Contract API dependency are installed, run:

```bash
go get github.com/hyperledger/fabric-contract-api-go/v2/contractapi
go test -tags fabric ./...
```

## Current limitation

This repository currently commits the chaincode source and pure unit tests. A
local Fabric test network, generated MSP materials, deployed chaincode package,
and real Gateway adapter remain separate roadmap items.
