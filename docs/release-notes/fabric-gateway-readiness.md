# Fabric Gateway Readiness Release Note

## Scope

This note describes the current release readiness of Fabric-related MEPN
features.

## Current Release Position

The current release is suitable for:

- prototype demonstration
- local development
- UAT preparation
- outbox/reconciliation visibility
- mock integration workflow review
- reviewer education around local hash evidence versus external anchoring

The current release is not ready to claim real Fabric Gateway anchoring.

## What Is Implemented

- Fabric mode environment contract.
- Safe default mock mode.
- Gateway mode configuration validation.
- Worker guard that prevents mock anchor success in gateway mode.
- API status endpoint for Fabric mode/configuration visibility.
- Integrations UI card showing Fabric runtime mode.
- Azure VM read-only mount path for future Fabric certificate/key material.
- Canonical hash verification guide.
- UAT evidence labels for mock, pending, failed, unavailable, and real Gateway
  evidence.

## What Is Not Implemented Yet

- Hash-only Fabric chaincode.
- Local Fabric test network.
- Real worker Fabric Gateway adapter.
- Real Gateway submit/commit verification.
- Database/API shape for real transaction metadata.
- Graph anchor/hash overlay.
- Gated real Fabric integration tests.
- Browser screenshots proving real verified Gateway state.
- Automated delivery of Fabric certificate/key material through CI/CD or a
  secret manager.

## Required Language For Demo And Review

Use:

```text
Fabric mock adapter evidence
local canonical hash verification
outbox anchor request queued
gateway mode configured but adapter not implemented
```

Do not use:

```text
real Fabric anchoring complete
blockchain verified
Fabric transaction confirmed
production-ready Gateway integration
```

unless the real chaincode, Gateway adapter, transaction metadata, and gated
integration tests are complete.

## Operational Caveat

If `FABRIC_MODE=gateway` is enabled before the real adapter exists, Fabric
anchor requests must fail or retry. This is intentional. The system must not
produce mock Fabric success while configured for real Gateway mode.
