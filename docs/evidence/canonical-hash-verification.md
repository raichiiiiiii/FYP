# Canonical Hash Verification

## Purpose

This guide explains how MEPN currently creates and verifies local canonical hash
records for audit and evidence review.

It is reviewer-facing documentation. It does not claim real Fabric Gateway
verification is complete.

## Current Implementation Authority

The current API implementation is:

```text
apps/api/src/modules/audit/audit-hash.service.ts
apps/api/src/modules/evidence/hash-records/hash-records.service.ts
```

## Hash Algorithm

MEPN uses:

```text
SHA-256
```

The stored hash is a lowercase hexadecimal digest of the canonical JSON text
encoded as UTF-8.

## Canonical JSON Rules

Before hashing, the API normalizes the input:

| Input shape | Canonical behavior |
|---|---|
| Object | Object keys are sorted alphabetically. |
| Array | Array order is preserved. |
| Date | Date values are converted to ISO-8601 strings. |
| `undefined` object field | The field is omitted. |
| Primitive value | String, number, boolean, and null values are preserved. |
| Money field in supported entity payloads | Numeric money values are formatted to two decimal places where the backend payload helper applies `money()`. |

The normalized value is serialized with:

```text
JSON.stringify(canonicalJson)
```

Then hashed with SHA-256.

## Entity Hash Records

When a hash record is created for a supported entity, the API builds a canonical
payload for that entity type and entity ID.

Supported entity types currently include:

```text
Project
Supplier
Requisition
RFQ
Quotation
PurchaseOrder
Receipt
Invoice
Document
DocumentVersion
EvidenceItem
EvidencePack
```

If the entity is available, verification recomputes the hash from the live
entity payload.

If the entity cannot be loaded later, verification falls back to the stored
canonical JSON snapshot and labels the source as:

```text
stored-canonical-json
```

## Anchor Boundary

Creating a hash record queues:

```text
FABRIC_ANCHOR_REQUESTED
```

through the outbox.

Current modes:

| Mode | Meaning |
|---|---|
| `mock` | The worker may create mock anchor evidence labelled `ANCHORED_MOCK`. This is not real Fabric verification. |
| `gateway` | Mock anchor success is disabled. Real Gateway submission remains blocked until chaincode, identity material, network access, and the worker Gateway adapter are implemented. |

## Reviewer Interpretation

Use these labels when reviewing hash evidence:

| State | Reviewer interpretation |
|---|---|
| Stored hash matches computed hash | Local integrity check passed for the current payload source. |
| Stored hash differs from computed hash | The live entity no longer matches the stored canonical payload. Investigate before relying on the record. |
| Anchor status `NOT_REQUESTED` | No outbox anchor request exists. |
| Anchor status `ANCHOR_REQUESTED` | An outbox request exists, but no anchor record is available yet. |
| Anchor status `ANCHORED_MOCK` | Mock adapter completed local anchor simulation. This is adapter evidence only. |
| Real Gateway transaction present | Not available in the current implementation. Must not be assumed from mock status. |

## What Must Not Be Claimed Yet

Do not claim:

- real Fabric Gateway anchoring is complete
- a mock transaction ID is a real Fabric transaction
- local hash verification proves external blockchain anchoring
- a pending or failed outbox event is verified evidence

## Open Work

- Implement and deploy hash-only Fabric chaincode.
- Implement the worker Fabric Gateway adapter.
- Store real Gateway transaction and commit metadata.
- Add gated real Fabric integration tests.
- Add browser screenshots for mock, pending, failed, unavailable, and verified
  states after the UI has real/seeded data for each state.
