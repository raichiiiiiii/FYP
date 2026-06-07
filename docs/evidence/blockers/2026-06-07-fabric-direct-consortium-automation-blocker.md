# Fabric Direct Consortium Automation Blocker

Date: 2026-06-07

## Blocked Scope

- Direct API execution of Fabric channel creation.
- Direct API joining of another organization to a real Fabric channel.
- Automatic MSP/certificate onboarding into a live consortium.
- Full production Fabric operator automation.

## Blocker Type

- Product/operator decision.
- Credentials/secrets.
- External Fabric runtime administration.
- Local tooling path/configuration.

## Current Repository State

The implemented Fabric governance API is intentionally operator-assisted. It
records networks, channels, invitations, memberships, proposals, approvals,
readiness, and sanitized operator execution evidence.

The current accepted governance requirement explicitly says the application
does not initially:

- store Fabric admin private keys;
- enroll MSP identities directly;
- generate production MSP material;
- sign channel config updates using admin certificates;
- create/join peers automatically;
- manage orderers;
- submit channel config updates automatically;
- act as a Fabric CA/admin console.

The current runtime Fabric configuration is Gateway application identity
material for hash anchoring and `ReadAnchor` verification. It is not channel
admin/orderer administration material.

## Commands Attempted

```powershell
where.exe peer
where.exe osnadmin
where.exe configtxgen
where.exe configtxlator
where.exe fabric-ca-client
```

Result:

```text
INFO: Could not find files for the given pattern(s).
```

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File infra\fabric\scripts\check-prereqs.ps1
```

Sanitized result:

```text
Docker: available
Git: available
Bash: available
Go: available
Fabric samples test-network: available
```

Environment inspection was also performed with secret-like values redacted. The
available Fabric variables describe Gateway mode for application anchoring:

```text
FABRIC_ENABLED=true
FABRIC_MODE=gateway
FABRIC_GATEWAY_URL=grpcs://localhost:7051
FABRIC_MSP_ID=Org1MSP
FABRIC_CHANNEL=mepn-audit
FABRIC_CHAINCODE=audit-anchor
FABRIC_PEER_ENDPOINT=localhost:7051
FABRIC_GATEWAY_HOST_ALIAS=peer0.org1.example.com
FABRIC_*_CERT_PATH=[redacted]
FABRIC_PRIVATE_KEY_PATH=[redacted]
```

No admin orderer endpoint, orderer admin TLS key/cert, channel config profile,
Fabric CA registrar identity, or approved channel-admin secret custody contract
is configured.

## Why Implementation Is Blocked

Direct Fabric channel creation and organization join are not Fabric Gateway
chaincode calls. They require channel configuration artifacts, orderer
administration access, organization admin signatures, MSP material, and
operational recovery rules for partially applied topology changes.

Implementing those operations inside the API now would contradict the accepted
operator-assisted governance boundary and would require the app to handle admin
private-key custody without an approved secret-management and signing model.

## Work Completed In This Run

- Reproduced `corepack pnpm test:integration` failure.
- Identified the failure source: host integration tests inherited Docker-only
  `MINIO_ENDPOINT=http://minio:9000`.
- Fixed integration test isolation so tests use `TEST_MINIO_ENDPOINT` or
  `http://localhost:9000` instead of inherited Docker service DNS.
- Verified `corepack pnpm test:integration` passes.
- Committed the fix as:
  - `2ff838f test(api): isolate integration MinIO endpoint`

## Remaining Work

Before direct Fabric topology automation can be implemented, the project needs:

1. A new ADR approving direct Fabric topology automation.
2. A product/operator decision replacing or extending the current
   operator-assisted governance boundary.
3. A managed secret store decision for channel-admin and orderer-admin material.
4. A Fabric CA/onboarding decision:
   - external CA only;
   - app-mediated enrollment;
   - or dedicated operator-agent enrollment.
5. Defined custody rules for:
   - Fabric admin signing cert/key;
   - orderer admin TLS cert/key;
   - organization MSP admin identities;
   - CA registrar identity.
6. Channel config signing/update design:
   - configtx profile/source;
   - multi-org signature collection;
   - idempotency;
   - rollback/retry after partial failures.
7. A dedicated operator runner or sidecar with Fabric binaries available:
   - `peer`;
   - `osnadmin`;
   - `configtxgen`;
   - `configtxlator`;
   - `fabric-ca-client`.
8. Gated integration tests against a real Fabric network that can safely create,
   join, update, and tear down test channels.

## What Remains Possible Inside The Repository

Repository-implementable preparatory slices:

- Add an ADR for direct Fabric topology automation.
- Add an automation preflight/readiness endpoint that verifies required
  non-secret configuration is present and reports missing prerequisites.
- Add a disabled-by-default operator-agent contract/interface.
- Add unit tests that prove the API refuses direct execution unless the
  explicit automation mode and admin material contract are configured.
- Keep the existing operator-assisted governance workflow as the safe default.

## Exact Resume Steps

1. Approve a new ADR for Fabric topology automation.
2. Define and document the admin secret mount layout.
3. Add explicit environment names for the operator runner. Do not reuse Gateway
   identity variables for channel administration.
4. Provide a disposable Fabric integration-test network where automated channel
   creation/join can be safely exercised.
5. Implement automation behind a disabled-by-default flag, for example:
   `FABRIC_TOPOLOGY_AUTOMATION_ENABLED=true`.
6. Add direct execution tests that prove:
   - missing admin material fails clearly;
   - channel creation submits a real orderer/channel config update;
   - organization join uses real MSP/admin material;
   - no PEM/private key appears in logs, API responses, screenshots, or docs.

## Safe To Commit

Yes. This blocker note contains no secret contents, PEM blocks, tokens, or
private keys.
